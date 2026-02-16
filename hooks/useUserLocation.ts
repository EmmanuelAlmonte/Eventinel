/**
 * useUserLocation Hook
 *
 * Handles location permission and user location acquisition.
 * Returns location, permission status, and source metadata.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';
type LocationSource = 'fresh' | 'cached' | 'default' | 'none';

export interface UseUserLocationOptions {
  fallback?: 'default' | 'none';
  defaultLocation?: [number, number];
  accuracy?: Location.Accuracy;
  timeout?: number;
  lastKnownMaxAgeMs?: number;
}

const DEFAULT_TIMEOUT = __DEV__ ? 10000 : 5000;
const DEFAULT_LAST_KNOWN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface UseUserLocationResult {
  location: [number, number] | null;
  permission: PermissionStatus;
  source: LocationSource;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const logLocation = (tag: string, data?: unknown) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Location ${timestamp}] ${tag}`, data !== undefined ? data : '');
  }
};

type LocationContext = {
  fallback: 'default' | 'none';
  defaultLocation?: [number, number];
  timeout: number;
  lastKnownMaxAgeMs: number;
  currentLocation: [number, number] | null;
};

type LocationSetters = {
  setLocation: (value: [number, number] | null) => void;
  setPermission: (value: PermissionStatus) => void;
  setSource: (value: LocationSource) => void;
  setIsLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

function applyDefaultLocation(context: LocationContext, setters: LocationSetters): boolean {
  if (context.fallback === 'default' && context.defaultLocation) {
    setters.setLocation(context.defaultLocation);
    setters.setSource('default');
    setters.setIsLoading(false);
    return true;
  }
  return false;
}

async function resolvePermission(setters: LocationSetters): Promise<Location.PermissionStatus> {
  logLocation('🔒 Checking permission...');
  let { status } = await Location.getForegroundPermissionsAsync();
  logLocation('🔒 Current permission status:', status);

  if (status !== 'granted') {
    logLocation('🔒 Requesting permission...');
    const result = await Location.requestForegroundPermissionsAsync();
    status = result.status;
    logLocation('🔒 Permission result:', status);
  }

  setters.setPermission(status === 'granted' ? 'granted' : 'denied');
  return status;
}

async function resolveCachedLocation(
  maxAgeMs: number
): Promise<[number, number] | null> {
  logLocation(`📦 Checking CACHED location (maxAge: ${Math.round(maxAgeMs / 1000)}s)...`);
  try {
    const cached = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs });
    if (!cached) {
      logLocation('📦 No cached location available');
      return null;
    }

    const cachedCoords: [number, number] = [cached.coords.longitude, cached.coords.latitude];
    logLocation('📦 Got CACHED location', {
      coords: cachedCoords,
      age: cached.timestamp ? `${Math.round((Date.now() - cached.timestamp) / 1000)}s ago` : 'unknown',
    });
    return cachedCoords;
  } catch (error) {
    logLocation('📦 Cache error:', error);
    return null;
  }
}

async function resolveFreshLocation(timeout: number): Promise<Location.LocationObject | null> {
  logLocation(`🛰️ Fetching FRESH location via watchPosition (timeout: ${timeout}ms)...`);

  return new Promise<Location.LocationObject | null>((resolve) => {
    let subscription: Location.LocationSubscription | null = null;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      logLocation(`🛰️ ⏰ TIMEOUT after ${timeout}ms!`);
      subscription?.remove();
      resolve(null);
    }, timeout);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 0,
        timeInterval: 100,
      },
      (locationUpdate) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        subscription?.remove();
        resolve(locationUpdate);
      }
    )
      .then((sub) => {
        subscription = sub;
        if (resolved) {
          sub.remove();
        }
      })
      .catch((error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        logLocation('🛰️ watchPosition setup error:', error);
        resolve(null);
      });
  });
}

function handlePermissionDenied(context: LocationContext, setters: LocationSetters): void {
  logLocation('❌ Permission DENIED - using fallback');
  if (!applyDefaultLocation(context, setters)) {
    setters.setSource('none');
    setters.setIsLoading(false);
  }
}

async function updateFromFreshLocation(
  context: LocationContext,
  setters: LocationSetters
): Promise<void> {
  const freshStartTime = Date.now();

  try {
    const freshLocation = await resolveFreshLocation(context.timeout);
    const elapsed = Date.now() - freshStartTime;

    if (freshLocation) {
      const freshCoords: [number, number] = [freshLocation.coords.longitude, freshLocation.coords.latitude];
      logLocation(`🛰️ ✅ Got FRESH GPS location in ${elapsed}ms`, {
        coords: freshCoords,
        accuracy: freshLocation.coords.accuracy,
      });
      setters.setLocation(freshCoords);
      setters.setSource('fresh');
      setters.setIsLoading(false);
      return;
    }

    logLocation(`🛰️ ❌ Fresh location TIMED OUT after ${elapsed}ms - keeping current location`);
    if (!context.currentLocation) {
      applyDefaultLocation(context, setters);
    }
  } catch (error) {
    logLocation('🛰️ ❌ Fresh location ERROR:', error);
    if (!context.currentLocation) {
      applyDefaultLocation(context, setters);
    }
  }
}

async function resolveLocationFlow(context: LocationContext, setters: LocationSetters): Promise<void> {
  if (context.fallback === 'default' && context.defaultLocation && !context.currentLocation) {
    logLocation('📍 Setting DEFAULT location', context.defaultLocation);
    setters.setLocation(context.defaultLocation);
    setters.setSource('default');
    setters.setIsLoading(false);
  }

  const permissionStatus = await resolvePermission(setters);
  if (permissionStatus !== 'granted') {
    handlePermissionDenied(context, setters);
    return;
  }

  logLocation('✅ Permission GRANTED');
  const cachedCoords = await resolveCachedLocation(context.lastKnownMaxAgeMs);
  if (cachedCoords) {
    setters.setLocation(cachedCoords);
    setters.setSource('cached');
    setters.setIsLoading(false);
  }

  await updateFromFreshLocation(context, setters);
}

export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationResult {
  const {
    fallback = 'none',
    defaultLocation,
    timeout = DEFAULT_TIMEOUT,
    lastKnownMaxAgeMs = DEFAULT_LAST_KNOWN_MAX_AGE_MS,
  } = options;

  const [location, setLocation] = useState<[number, number] | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [source, setSource] = useState<LocationSource>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    logLocation('▶️ START getLocation()');
    setIsLoading(true);
    setError(null);

    const context: LocationContext = {
      fallback,
      defaultLocation,
      timeout,
      lastKnownMaxAgeMs,
      currentLocation: location,
    };
    const setters: LocationSetters = {
      setLocation,
      setPermission,
      setSource,
      setIsLoading,
      setError,
    };

    try {
      await resolveLocationFlow(context, setters);
    } catch (errorValue) {
      logLocation('❌ FATAL ERROR:', errorValue);
      setters.setError(errorValue instanceof Error ? errorValue.message : 'Location error');
      applyDefaultLocation(context, setters);
    } finally {
      logLocation('🏁 END getLocation()');
      setters.setIsLoading(false);
    }
  }, [defaultLocation, fallback, lastKnownMaxAgeMs, location, timeout]);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, permission, source, isLoading, error, refresh: getLocation };
}
