import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { encodeGeohashFromLngLat, type LngLat, type ViewportBounds } from '@lib/map/geohashViewport';
import {
  isVisibleCellCoverageAcceptable,
  planIncidentCells,
  shouldReuseIncidentSubscriptionPlanForViewport,
  summarizeVisibleCellCoverage,
  type MapSubscriptionViewport,
} from '@lib/map/subscriptionPlanner';

import { extractZoomFromProperties, isLngLat } from './helpers';

type MapIdleState = {
  properties?: {
    center?: LngLat;
    bounds?: {
      ne?: LngLat;
      sw?: LngLat;
    };
    zoom?: number;
    zoomLevel?: number;
    camera?: {
      zoom?: number;
      zoomLevel?: number;
    };
  };
};

type UseMapViewportSubscriptionOptions = {
  isFocused: boolean;
  lastCameraZoomRef: MutableRefObject<number>;
  setMapFocused: (focused: boolean) => void;
  setMapSubscriptionAnchor: (anchor: [number, number] | null) => void;
  setMapSubscriptionViewport: (viewport: MapSubscriptionViewport | null) => void;
};

export function useMapViewportSubscription({
  isFocused,
  lastCameraZoomRef,
  setMapFocused,
  setMapSubscriptionAnchor,
  setMapSubscriptionViewport,
}: UseMapViewportSubscriptionOptions) {
  const viewportDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressViewportUpdatesRef = useRef(false);
  const lastViewportAnchorHashRef = useRef<string | null>(null);
  const lastViewportPlanKeyRef = useRef<string | null>(null);
  const lastViewportDesiredCellsRef = useRef<string[] | null>(null);
  const lastViewportZoomRef = useRef<number | null>(null);
  const lastViewportUpdateAtRef = useRef(0);
  const [isViewportCoveredBySubscriptionGrid, setIsViewportCoveredBySubscriptionGrid] = useState(true);

  const handleMapIdle = useCallback(
    (state: MapIdleState) => {
      if (!isFocused || suppressViewportUpdatesRef.current) {
        return;
      }

      const center = state?.properties?.center;
      const ne = state?.properties?.bounds?.ne;
      const sw = state?.properties?.bounds?.sw;
      const zoomFromEvent = extractZoomFromProperties(state?.properties);
      let zoom: number | null =
        typeof zoomFromEvent === 'number' && Number.isFinite(zoomFromEvent)
          ? zoomFromEvent
          : lastCameraZoomRef.current;

      if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return;

      const zoomBucket = parseFloat(zoom.toFixed(2));
      if (!isLngLat(center) || !isLngLat(ne) || !isLngLat(sw)) return;

      const bounds: ViewportBounds = { ne, sw };
      const centerGeohash = encodeGeohashFromLngLat(
        center,
        MAP_SUBSCRIPTION.GEOHASH_PRECISION
      );
      if (!centerGeohash) return;

      const nextPlan = planIncidentCells({
        mode: MAP_SUBSCRIPTION.SUBSCRIPTION_PLANNER_MODE,
        precision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
        center,
        bounds,
        zoom: zoomBucket,
        maxCells: MAP_SUBSCRIPTION.MAX_ACTIVE_CELLS,
        prefetchRing: MAP_SUBSCRIPTION.SUBSCRIPTION_PREFETCH_RING,
      });
      if (nextPlan.desiredCells.length === 0 || nextPlan.visibleCells.length === 0) return;

      const nextCoverage = summarizeVisibleCellCoverage(
        nextPlan.visibleCells,
        nextPlan.desiredCells
      );
      const isViewportCovered = isVisibleCellCoverageAcceptable(nextCoverage, {
        maxMissingCells: MAP_SUBSCRIPTION.VIEWPORT_SOFT_COVERAGE_MAX_MISSING_CELLS,
        minCoverageRatio: MAP_SUBSCRIPTION.VIEWPORT_SOFT_COVERAGE_MIN_RATIO,
      });

      setIsViewportCoveredBySubscriptionGrid(isViewportCovered);
      if (!isViewportCovered) {
        if (__DEV__) {
          console.log(
            `[MapScreen] viewport exceeds incident subscription budget (${nextCoverage.visibleCellCount} visible cells, desired:${nextCoverage.desiredCellCount}, missing:${nextCoverage.missingVisibleCellCount}, ratio:${nextCoverage.coverageRatio.toFixed(2)}, truncated:${nextPlan.truncated})`
          );
        }
        return;
      }

      const canReuseActiveCoverage = shouldReuseIncidentSubscriptionPlanForViewport({
        activeDesiredCells: lastViewportDesiredCellsRef.current,
        nextVisibleCells: nextPlan.visibleCells,
        previousZoom: lastViewportZoomRef.current,
        nextZoom: zoomBucket,
        maxMissingCells: MAP_SUBSCRIPTION.VIEWPORT_REUSE_MAX_MISSING_CELLS,
        minCoverageRatio: MAP_SUBSCRIPTION.VIEWPORT_REUSE_MIN_RATIO,
        maxZoomDelta: MAP_SUBSCRIPTION.VIEWPORT_REUSE_MAX_ZOOM_DELTA,
      });
      if (canReuseActiveCoverage) {
        return;
      }

      if (
        lastViewportAnchorHashRef.current === centerGeohash &&
        lastViewportPlanKeyRef.current === nextPlan.key
      ) {
        return;
      }

      if (viewportDebounceTimerRef.current) {
        clearTimeout(viewportDebounceTimerRef.current);
      }

      const nextAnchor: LngLat = [center[0], center[1]];
      const nextAnchorHash = centerGeohash;
      const nextViewport: MapSubscriptionViewport = {
        center: [center[0], center[1]],
        bounds,
        zoom: zoomBucket,
      };

      viewportDebounceTimerRef.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastViewportUpdateAtRef.current < MAP_SUBSCRIPTION.VIEWPORT_MIN_UPDATE_INTERVAL_MS) {
          return;
        }

        lastViewportUpdateAtRef.current = now;
        lastViewportAnchorHashRef.current = nextAnchorHash;
        lastViewportPlanKeyRef.current = nextPlan.key;
        lastViewportDesiredCellsRef.current = nextPlan.desiredCells;
        lastViewportZoomRef.current = zoomBucket;
        setMapSubscriptionViewport(nextViewport);
        setMapSubscriptionAnchor(nextAnchor);

        if (__DEV__) {
          console.log(
            `[MapScreen] subscription viewport -> ${nextAnchorHash} zoom:${nextViewport.zoom.toFixed(2)} desired:${nextPlan.desiredCells.length} visible:${nextPlan.visibleCells.length}`
          );
        }
      }, MAP_SUBSCRIPTION.VIEWPORT_UPDATE_DEBOUNCE_MS);
    },
    [isFocused, lastCameraZoomRef, setMapSubscriptionAnchor, setMapSubscriptionViewport]
  );

  const clearViewportDebounce = useCallback(() => {
    if (viewportDebounceTimerRef.current) {
      clearTimeout(viewportDebounceTimerRef.current);
      viewportDebounceTimerRef.current = null;
    }
  }, []);

  const teardownMapFocusState = useCallback(() => {
    setMapFocused(false);
    setIsViewportCoveredBySubscriptionGrid(true);
    clearViewportDebounce();
  }, [
    clearViewportDebounce,
    setMapFocused,
  ]);

  useEffect(() => {
    if (isFocused) {
      suppressViewportUpdatesRef.current = false;
      setMapFocused(true);
      return;
    }

    suppressViewportUpdatesRef.current = true;
    clearViewportDebounce();
    teardownMapFocusState();
  }, [clearViewportDebounce, isFocused, setMapFocused, teardownMapFocusState]);

  useEffect(() => {
    return () => {
      teardownMapFocusState();
      setMapSubscriptionAnchor(null);
      setMapSubscriptionViewport(null);
      lastViewportAnchorHashRef.current = null;
      lastViewportPlanKeyRef.current = null;
      lastViewportDesiredCellsRef.current = null;
      lastViewportZoomRef.current = null;
    };
  }, [setMapSubscriptionAnchor, setMapSubscriptionViewport, teardownMapFocusState]);

  useEffect(() => {
    return () => {
      clearViewportDebounce();
    };
  }, [clearViewportDebounce]);

  return { handleMapIdle, isViewportCoveredBySubscriptionGrid };
}
