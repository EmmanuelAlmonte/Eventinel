import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';

import { MAPBOX_CONFIG } from '@lib/map/constants';
import type { MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

import { useStartupNavigationInteraction } from '../StartupNavigationInteractionContext';
import { useSharedLocation } from '../LocationContext';

const STARTUP_INTERACTION_GATE_TIMEOUT_MS = 750;
const INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS = 8000;
const POST_STARTUP_TAB_SUBSCRIPTION_DELAY_MS = 3000;

function areSameLngLat(
  left: [number, number] | null,
  right: [number, number] | null
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left[0] === right[0] && left[1] === right[1];
}

function areSameViewport(
  left: MapSubscriptionViewport | null,
  right: MapSubscriptionViewport | null
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  return (
    left.zoom === right.zoom &&
    areSameLngLat(left.center, right.center) &&
    areSameLngLat(left.bounds.ne, right.bounds.ne) &&
    areSameLngLat(left.bounds.sw, right.bounds.sw)
  );
}

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
  const initialSubscriptionLocationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const initialSubscriptionLocationTimerDeadlineRef = useRef<number | null>(null);
  const initialSubscriptionLocationTimerModeRef = useRef<'initial' | 'post-interaction' | null>(
    null
  );
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
    const clearInitialSubscriptionLocationTimer = () => {
      if (initialSubscriptionLocationTimerRef.current != null) {
        clearTimeout(initialSubscriptionLocationTimerRef.current);
        initialSubscriptionLocationTimerRef.current = null;
      }

      initialSubscriptionLocationTimerDeadlineRef.current = null;
      initialSubscriptionLocationTimerModeRef.current = null;
    };

    const scheduleInitialSubscriptionLocationRelease = (
      delayMs: number,
      mode: 'initial' | 'post-interaction'
    ) => {
      clearInitialSubscriptionLocationTimer();

      initialSubscriptionLocationTimerDeadlineRef.current = Date.now() + delayMs;
      initialSubscriptionLocationTimerModeRef.current = mode;
      initialSubscriptionLocationTimerRef.current = setTimeout(() => {
        initialSubscriptionLocationTimerRef.current = null;
        initialSubscriptionLocationTimerDeadlineRef.current = null;
        initialSubscriptionLocationTimerModeRef.current = null;
        hasReleasedInitialSubscriptionLocationRef.current = true;
        setIsInitialSubscriptionLocationSettled(true);
      }, delayMs);
    };

    if (!location) {
      if (
        !hasReleasedInitialSubscriptionLocationRef.current &&
        initialSubscriptionLocationTimerRef.current == null
      ) {
        setIsInitialSubscriptionLocationSettled(false);
      }
      return;
    }

    if (hasReleasedInitialSubscriptionLocationRef.current) {
      setIsInitialSubscriptionLocationSettled(true);
      return;
    }

    if (initialSubscriptionLocationTimerRef.current != null) {
      if (
        lastStartupTabInteractionAt != null &&
        initialSubscriptionLocationTimerModeRef.current === 'initial'
      ) {
        const initialTimerRemainingMs =
          initialSubscriptionLocationTimerDeadlineRef.current == null
            ? INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS
            : Math.max(initialSubscriptionLocationTimerDeadlineRef.current - Date.now(), 0);
        const nextDelayMs = Math.min(
          initialTimerRemainingMs,
          POST_STARTUP_TAB_SUBSCRIPTION_DELAY_MS
        );

        scheduleInitialSubscriptionLocationRelease(nextDelayMs, 'post-interaction');
      }
      return;
    }

    setIsInitialSubscriptionLocationSettled(false);
    const releaseDelayMs =
      lastStartupTabInteractionAt == null
        ? INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS
        : POST_STARTUP_TAB_SUBSCRIPTION_DELAY_MS;

    scheduleInitialSubscriptionLocationRelease(
      releaseDelayMs,
      lastStartupTabInteractionAt == null ? 'initial' : 'post-interaction'
    );
  }, [lastStartupTabInteractionAt, location]);

  useEffect(() => {
    return () => {
      if (initialSubscriptionLocationTimerRef.current != null) {
        clearTimeout(initialSubscriptionLocationTimerRef.current);
        initialSubscriptionLocationTimerRef.current = null;
      }
      initialSubscriptionLocationTimerDeadlineRef.current = null;
      initialSubscriptionLocationTimerModeRef.current = null;
    };
  }, []);

  const handleSetMapFocused = useCallback((focused: boolean) => {
    setIsMapFocused(focused);
  }, []);

  const handleSetFeedFocused = useCallback((focused: boolean) => {
    setIsFeedFocused(focused);
  }, []);

  const handleSetMapSubscriptionAnchor = useCallback((anchor: [number, number] | null) => {
    setMapSubscriptionAnchor((prev) => (areSameLngLat(prev, anchor) ? prev : anchor));
    if (anchor === null) {
      setMapSubscriptionViewport((prev) => (prev === null ? prev : null));
    }
  }, []);

  const handleSetMapSubscriptionViewport = useCallback(
    (viewport: MapSubscriptionViewport | null) => {
      setMapSubscriptionViewport((prev) =>
        areSameViewport(prev, viewport) ? prev : viewport
      );
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
