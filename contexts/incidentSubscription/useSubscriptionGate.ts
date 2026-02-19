import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';

import { MAPBOX_CONFIG } from '@lib/map/constants';
import type { MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

import { useSharedLocation } from '../LocationContext';

export interface SubscriptionGateState {
  location: [number, number] | null;
  subscriptionLocation: [number, number] | null;
  effectiveSubscriptionViewport: MapSubscriptionViewport | null;
  isSubscriptionEnabled: boolean;
  setMapFocused: (focused: boolean) => void;
  setMapSubscriptionAnchor: (anchor: [number, number] | null) => void;
  setMapSubscriptionViewport: (viewport: MapSubscriptionViewport | null) => void;
  setFeedFocused: (focused: boolean) => void;
}

function isAppStateActive(state: AppStateStatus): boolean {
  return state !== 'background' && state !== 'inactive';
}

export function useSubscriptionGate(): SubscriptionGateState {
  const { location } = useSharedLocation();
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [isFeedFocused, setIsFeedFocused] = useState(false);
  const [isStartupInteractionSettled, setIsStartupInteractionSettled] = useState(false);
  const [mapSubscriptionAnchor, setMapSubscriptionAnchor] = useState<[number, number] | null>(
    null
  );
  const [mapSubscriptionViewport, setMapSubscriptionViewport] = useState<MapSubscriptionViewport | null>(
    null
  );
  const [isAppActive, setIsAppActive] = useState(() => isAppStateActive(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener?.('change', (nextState) => {
      setIsAppActive(isAppStateActive(nextState));
    });
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      if (!isMounted) {
        return;
      }
      setIsStartupInteractionSettled(true);
    });

    return () => {
      isMounted = false;
      interactionHandle.cancel?.();
    };
  }, []);

  const handleSetMapFocused = useCallback((focused: boolean) => {
    setIsMapFocused(focused);
  }, []);

  const handleSetFeedFocused = useCallback((focused: boolean) => {
    setIsFeedFocused(focused);
  }, []);

  const handleSetMapSubscriptionAnchor = useCallback((anchor: [number, number] | null) => {
    setMapSubscriptionAnchor(anchor);
    if (anchor === null) {
      setMapSubscriptionViewport(null);
    }
  }, []);

  const handleSetMapSubscriptionViewport = useCallback(
    (viewport: MapSubscriptionViewport | null) => {
      setMapSubscriptionViewport(viewport);
    },
    []
  );

  const isScreenFocused = isMapFocused || isFeedFocused;
  const isSubscriptionEnabled =
    !!location && isScreenFocused && isAppActive && isStartupInteractionSettled;
  const subscriptionLocation = isMapFocused ? mapSubscriptionAnchor ?? location : location;

  const effectiveSubscriptionViewport = useMemo(() => {
    if (!isMapFocused) return null;
    if (!subscriptionLocation) return null;

    const fallbackViewport: MapSubscriptionViewport = {
      center: subscriptionLocation,
      bounds: {
        ne: subscriptionLocation,
        sw: subscriptionLocation,
      },
      zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
    };

    return mapSubscriptionViewport ?? fallbackViewport;
  }, [isMapFocused, mapSubscriptionViewport, subscriptionLocation]);

  return {
    location,
    subscriptionLocation,
    effectiveSubscriptionViewport,
    isSubscriptionEnabled,
    setMapFocused: handleSetMapFocused,
    setMapSubscriptionAnchor: handleSetMapSubscriptionAnchor,
    setMapSubscriptionViewport: handleSetMapSubscriptionViewport,
    setFeedFocused: handleSetFeedFocused,
  };
}
