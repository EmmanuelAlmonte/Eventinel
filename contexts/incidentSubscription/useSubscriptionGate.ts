import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';

import { MAPBOX_CONFIG } from '@lib/map/constants';
import type { MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

import { useStartupNavigationInteraction } from '../StartupNavigationInteractionContext';
import { useSharedLocation } from '../LocationContext';

const STARTUP_INTERACTION_GATE_TIMEOUT_MS = 750;
const INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS = 8000;
const POST_STARTUP_TAB_SUBSCRIPTION_DELAY_MS = 3000;

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
  const { lastStartupTabInteractionAt } = useStartupNavigationInteraction();
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [isFeedFocused, setIsFeedFocused] = useState(false);
  const [isStartupInteractionSettled, setIsStartupInteractionSettled] = useState(false);
  const [isInitialSubscriptionLocationSettled, setIsInitialSubscriptionLocationSettled] = useState(false);
  const hasReleasedInitialSubscriptionLocationRef = useRef(false);
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
    let didSettle = false;
    const settleStartupInteractionGate = () => {
      if (!isMounted || didSettle) {
        return;
      }

      didSettle = true;
      setIsStartupInteractionSettled(true);
    };

    const fallbackTimer = setTimeout(
      settleStartupInteractionGate,
      STARTUP_INTERACTION_GATE_TIMEOUT_MS
    );

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      clearTimeout(fallbackTimer);
      settleStartupInteractionGate();
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      interactionHandle.cancel?.();
    };
  }, []);

  useEffect(() => {
    if (!location) {
      if (!hasReleasedInitialSubscriptionLocationRef.current) {
        setIsInitialSubscriptionLocationSettled(false);
      }
      return;
    }

    if (hasReleasedInitialSubscriptionLocationRef.current) {
      setIsInitialSubscriptionLocationSettled(true);
      return;
    }

    setIsInitialSubscriptionLocationSettled(false);
    const releaseDelayMs =
      lastStartupTabInteractionAt == null
        ? INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS
        : POST_STARTUP_TAB_SUBSCRIPTION_DELAY_MS;

    const timer = setTimeout(() => {
      hasReleasedInitialSubscriptionLocationRef.current = true;
      setIsInitialSubscriptionLocationSettled(true);
    }, releaseDelayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [lastStartupTabInteractionAt, location]);

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

  const isSubscriptionEnabled =
    !!location && isAppActive && isStartupInteractionSettled && isInitialSubscriptionLocationSettled;
  const subscriptionLocation =
    isMapFocused || (!isFeedFocused && mapSubscriptionAnchor)
      ? mapSubscriptionAnchor ?? location
      : location;

  const effectiveSubscriptionViewport = useMemo(() => {
    if (!isMapFocused && (isFeedFocused || !mapSubscriptionViewport)) return null;
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
  }, [isFeedFocused, isMapFocused, mapSubscriptionViewport, subscriptionLocation]);

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
