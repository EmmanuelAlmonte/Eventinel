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
  /** What to do when permission denied: 'default' uses fallback, 'none' returns null */
  fallback?: 'default' | 'none';
  /** Default location [longitude, latitude] if fallback='default' */
  defaultLocation?: [number, number];
  /** Location accuracy */
  accuracy?: Location.Accuracy;
  /** Timeout for location fetch in ms (default: 10000 in dev, 5000 in prod) */
  timeout?: number;
}

// Longer timeout in development (emulators are slow)
const DEFAULT_TIMEOUT = __DEV__ ? 10000 : 5000;

export interface UseUserLocationResult {
  /** [longitude, latitude] or null */
  location: [number, number] | null;
  /** Permission state */
  permission: PermissionStatus;
  /** Where location came from */
  source: LocationSource;
  /** True during initial fetch */
  isLoading: boolean;
  /** Error message if failed */
  error: string | null;
  /** Request fresh location */
  refresh: () => Promise<void>;
}

// Debug logger - only in DEV
const logLocation = (tag: string, data?: any) => {
  if (__DEV__) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    console.log(`[Location ${timestamp}] ${tag}`, data !== undefined ? data : '');
  }
};

export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationResult {
  const {
    fallback = 'none',
    defaultLocation,
    accuracy = Location.Accuracy.Balanced,
    timeout = DEFAULT_TIMEOUT,
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

    // Set default location IMMEDIATELY if available (UI shows instantly)
    if (fallback === 'default' && defaultLocation && !location) {
      logLocation('📍 Setting DEFAULT location', defaultLocation);
      setLocation(defaultLocation);
      setSource('default');
      setIsLoading(false); // Map shows immediately while we fetch real location in background
    }

    try {
      // Check/request permission
      logLocation('🔒 Checking permission...');
      let { status } = await Location.getForegroundPermissionsAsync();
      logLocation('🔒 Current permission status:', status);

      if (status !== 'granted') {
        logLocation('🔒 Requesting permission...');
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
        logLocation('🔒 Permission result:', status);
      }

      setPermission(status === 'granted' ? 'granted' : 'denied');

      if (status !== 'granted') {
        logLocation('❌ Permission DENIED - using fallback');
        if (fallback === 'default' && defaultLocation) {
          setLocation(defaultLocation);
          setSource('default');
          setIsLoading(false); // UI shows immediately with default location
        } else {
          setSource('none');
          setIsLoading(false);
        }
        return;
      }

      logLocation('✅ Permission GRANTED');

      // Try cached location first (faster)
      logLocation('📦 Checking CACHED location (maxAge: 60s)...');
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (cached) {
          const cachedCoords: [number, number] = [cached.coords.longitude, cached.coords.latitude];
          logLocation('📦 Got CACHED location', {
            coords: cachedCoords,
            age: cached.timestamp ? `${Math.round((Date.now() - cached.timestamp) / 1000)}s ago` : 'unknown',
          });
          setLocation(cachedCoords);
          setSource('cached');
          setIsLoading(false); // UI shows immediately with cached location
        } else {
          logLocation('📦 No cached location available');
        }
      } catch (cacheError) {
        logLocation('📦 Cache error:', cacheError);
      }

      // Get fresh location using watchPositionAsync (more reliable on emulators than getCurrentPositionAsync)
      // getCurrentPositionAsync is known to hang indefinitely on Android emulators
      logLocation(`🛰️ Fetching FRESH location via watchPosition (timeout: ${timeout}ms)...`);
      const freshStartTime = Date.now();

      try {
        const freshLocation = await new Promise<Location.LocationObject | null>((resolve) => {
          let subscription: Location.LocationSubscription | null = null;
          let resolved = false;

          // Timeout handler
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              logLocation(`🛰️ ⏰ TIMEOUT after ${timeout}ms!`);
              subscription?.remove();
              resolve(null);
            }
          }, timeout);

          // Start watching for location updates
          Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High, // Higher accuracy works better in emulators
              distanceInterval: 0, // Get first available position
              timeInterval: 100, // Check frequently
            },
            (locationUpdate) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                subscription?.remove();
                resolve(locationUpdate);
              }
            }
          ).then((sub) => {
            subscription = sub;
            // If already resolved (timeout), clean up immediately
            if (resolved) {
              sub.remove();
            }
          }).catch((err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              logLocation('🛰️ watchPosition setup error:', err);
              resolve(null);
            }
          });
        });

        const elapsed = Date.now() - freshStartTime;

        if (freshLocation) {
          const freshCoords: [number, number] = [freshLocation.coords.longitude, freshLocation.coords.latitude];
          logLocation(`🛰️ ✅ Got FRESH GPS location in ${elapsed}ms`, {
            coords: freshCoords,
            accuracy: freshLocation.coords.accuracy,
          });
          setLocation(freshCoords);
          setSource('fresh');
          setIsLoading(false);
        } else {
          logLocation(`🛰️ ❌ Fresh location TIMED OUT after ${elapsed}ms - keeping current location`);
          // Keep cached/default if we have it
          if (!location && fallback === 'default' && defaultLocation) {
            logLocation('🛰️ Using DEFAULT as final fallback');
            setLocation(defaultLocation);
            setSource('default');
            setIsLoading(false);
          }
        }
      } catch (freshError) {
        logLocation('🛰️ ❌ Fresh location ERROR:', freshError);
        if (!location && fallback === 'default' && defaultLocation) {
          setLocation(defaultLocation);
          setSource('default');
          setIsLoading(false);
        }
      }
    } catch (err) {
      logLocation('❌ FATAL ERROR:', err);
      setError(err instanceof Error ? err.message : 'Location error');

      if (fallback === 'default' && defaultLocation) {
        setLocation(defaultLocation);
        setSource('default');
        setIsLoading(false); // UI shows with fallback
      }
    } finally {
      // Ensure loading is always false at the end (safety net)
      logLocation('🏁 END getLocation()');
      setIsLoading(false);
    }
  }, [fallback, defaultLocation, accuracy, timeout, location]);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return { location, permission, source, isLoading, error, refresh: getLocation };
}
