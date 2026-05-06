import { useMemo } from 'react';

import { MAPBOX_CONFIG, MAP_SUBSCRIPTION } from '@lib/map/constants';
import {
  groupIncidentSubscriptionCells,
  planIncidentCells,
  type IncidentSubscriptionGroup,
  type MapSubscriptionViewport,
} from '@lib/map/subscriptionPlanner';

import type { UseIncidentSubscriptionOptions } from './types';

export interface IncidentSubscriptionPlanInputs {
  enabled: boolean;
  location: [number, number] | null;
  subscriptionLocation?: [number, number] | null;
  subscriptionViewport?: MapSubscriptionViewport | null;
}

export interface IncidentSubscriptionPlanResult {
  stableLocation: [number, number] | null;
  stableSubscriptionLocation: [number, number] | null;
  fallbackSubscriptionViewport: MapSubscriptionViewport | null;
  subscriptionPlan: ReturnType<typeof planIncidentCells> | null;
  desiredCells: string[];
  desiredSubscriptionGroups: IncidentSubscriptionGroup[];
  subscriptionFilterKey: string;
  locationKey: string;
}

export function useIncidentSubscriptionPlan({
  enabled,
  location,
  subscriptionLocation,
  subscriptionViewport,
}: UseIncidentSubscriptionOptions): IncidentSubscriptionPlanResult {
  const effectiveSubscriptionLocation = subscriptionLocation ?? location;
  const stableLocation = useMemo<[number, number] | null>(() => {
    if (!location) {
      return null;
    }
    return [location[0], location[1]];
  }, [location?.[0], location?.[1]]);

  const stableSubscriptionLocation = useMemo<[number, number] | null>(() => {
    if (!effectiveSubscriptionLocation) {
      return null;
    }
    return [effectiveSubscriptionLocation[0], effectiveSubscriptionLocation[1]];
  }, [effectiveSubscriptionLocation?.[0], effectiveSubscriptionLocation?.[1]]);

  const fallbackSubscriptionViewport: MapSubscriptionViewport | null =
    subscriptionViewport ?? (stableSubscriptionLocation
      ? {
          center: stableSubscriptionLocation,
          bounds: {
            ne: stableSubscriptionLocation,
            sw: stableSubscriptionLocation,
          },
          zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
        }
      : null);

  const subscriptionPlan = useMemo(() => {
    if (!enabled || !fallbackSubscriptionViewport) {
      return null;
    }

    return planIncidentCells({
      mode: MAP_SUBSCRIPTION.SUBSCRIPTION_PLANNER_MODE,
      precision: MAP_SUBSCRIPTION.GEOHASH_PRECISION,
      center: fallbackSubscriptionViewport.center,
      bounds: fallbackSubscriptionViewport.bounds,
      zoom: fallbackSubscriptionViewport.zoom,
      maxCells: MAP_SUBSCRIPTION.MAX_ACTIVE_CELLS,
      prefetchRing: MAP_SUBSCRIPTION.SUBSCRIPTION_PREFETCH_RING,
    });
  }, [
    enabled,
    fallbackSubscriptionViewport?.center[0],
    fallbackSubscriptionViewport?.center[1],
    fallbackSubscriptionViewport?.bounds?.ne?.[0],
    fallbackSubscriptionViewport?.bounds?.ne?.[1],
    fallbackSubscriptionViewport?.bounds?.sw?.[0],
    fallbackSubscriptionViewport?.bounds?.sw?.[1],
    fallbackSubscriptionViewport?.zoom,
  ]);

  const desiredCells = subscriptionPlan?.desiredCells ?? [];
  const desiredSubscriptionGroups = useMemo(
    () =>
      groupIncidentSubscriptionCells(
        desiredCells,
        MAP_SUBSCRIPTION.MAX_CELLS_PER_GROUPED_SUBSCRIPTION
      ),
    [desiredCells]
  );

  const subscriptionFilterKey = useMemo(() => {
    if (!enabled) {
      return 'disabled';
    }
    if (!subscriptionPlan) {
      return 'none';
    }

    const groupedKeys = desiredSubscriptionGroups
      .map((group) => group.key)
      .join('|');
    return [
      subscriptionPlan.key,
      `groupSize:${MAP_SUBSCRIPTION.MAX_CELLS_PER_GROUPED_SUBSCRIPTION}`,
      `groups:${groupedKeys}`,
    ].join('|');
  }, [desiredSubscriptionGroups, enabled, subscriptionPlan]);

  const locationKey = useMemo(() => {
    if (!location) {
      return 'none';
    }
    return `${location[0]},${location[1]}`;
  }, [location?.[0], location?.[1]]);

  return {
    stableLocation,
    stableSubscriptionLocation,
    fallbackSubscriptionViewport,
    subscriptionPlan,
    desiredCells,
    desiredSubscriptionGroups,
    subscriptionFilterKey,
    locationKey,
  };
}
