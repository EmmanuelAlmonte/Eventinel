import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { InteractionManager } from 'react-native';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { evaluateViewportCoverage, type LngLat, type ViewportBounds } from '@lib/map/geohashViewport';
import { computeCenterGridRadiusForZoom, type MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

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
  const deferredBlurTeardownRef = useRef<{ cancel?: () => void } | null>(null);
  const lastViewportAnchorHashRef = useRef<string | null>(null);
  const lastViewportZoomRef = useRef<number | null>(null);
  const lastViewportUpdateAtRef = useRef(0);
  const [isViewportCoveredBySubscriptionGrid, setIsViewportCoveredBySubscriptionGrid] = useState(true);

  const handleMapIdle = useCallback(
    (state: MapIdleState) => {
      if (!isFocused) {
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
      const coverageRadius = computeCenterGridRadiusForZoom(zoomBucket);
      const coverage = evaluateViewportCoverage(
        bounds,
        center,
        MAP_SUBSCRIPTION.GEOHASH_PRECISION,
        coverageRadius
      );
      if (!coverage) return;

      const isSoftCovered =
        coverage.missingViewportCellCount <= MAP_SUBSCRIPTION.VIEWPORT_SOFT_COVERAGE_MAX_MISSING_CELLS &&
        coverage.coverageRatio >= MAP_SUBSCRIPTION.VIEWPORT_SOFT_COVERAGE_MIN_RATIO;
      const isViewportCovered = coverage.isCoveredBySubscriptionGrid || isSoftCovered;

      setIsViewportCoveredBySubscriptionGrid(isViewportCovered);
      if (!isViewportCovered) {
        if (__DEV__) {
          const gridWidth = coverageRadius * 2 + 1;
          console.log(
            `[MapScreen] viewport exceeds ${gridWidth}x${gridWidth} p${MAP_SUBSCRIPTION.GEOHASH_PRECISION} grid (${coverage.viewportGeohashes.length} cells, missing:${coverage.missingViewportCellCount}, ratio:${coverage.coverageRatio.toFixed(2)})`
          );
        }
        return;
      }

      if (
        lastViewportAnchorHashRef.current === coverage.centerGeohash &&
        lastViewportZoomRef.current === zoomBucket
      ) {
        return;
      }

      if (viewportDebounceTimerRef.current) {
        clearTimeout(viewportDebounceTimerRef.current);
      }

      const nextAnchor: LngLat = [center[0], center[1]];
      const nextAnchorHash = coverage.centerGeohash;
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
        lastViewportZoomRef.current = zoomBucket;
        setMapSubscriptionViewport(nextViewport);
        setMapSubscriptionAnchor(nextAnchor);

        if (__DEV__) {
          console.log(
            `[MapScreen] subscription viewport -> ${nextAnchorHash} zoom:${nextViewport.zoom.toFixed(2)}`
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
    setMapSubscriptionAnchor(null);
    setMapSubscriptionViewport(null);
    setIsViewportCoveredBySubscriptionGrid(true);
    lastViewportAnchorHashRef.current = null;
    lastViewportZoomRef.current = null;
    clearViewportDebounce();
  }, [
    clearViewportDebounce,
    setMapFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  ]);

  useEffect(() => {
    if (deferredBlurTeardownRef.current) {
      deferredBlurTeardownRef.current.cancel?.();
      deferredBlurTeardownRef.current = null;
    }

    if (isFocused) {
      setMapFocused(true);
      return;
    }

    // Defer blur teardown until after transition interactions to avoid delaying
    // stack animation start on marker press navigation.
    deferredBlurTeardownRef.current = InteractionManager.runAfterInteractions(() => {
      deferredBlurTeardownRef.current = null;
      teardownMapFocusState();
    });

    return () => {
      if (deferredBlurTeardownRef.current) {
        deferredBlurTeardownRef.current.cancel?.();
        deferredBlurTeardownRef.current = null;
      }
    };
  }, [isFocused, setMapFocused, teardownMapFocusState]);

  useEffect(() => {
    return () => {
      if (deferredBlurTeardownRef.current) {
        deferredBlurTeardownRef.current.cancel?.();
        deferredBlurTeardownRef.current = null;
      }
      teardownMapFocusState();
    };
  }, [teardownMapFocusState]);

  useEffect(() => {
    return () => {
      clearViewportDebounce();
    };
  }, [clearViewportDebounce]);

  return { handleMapIdle, isViewportCoveredBySubscriptionGrid };
}
