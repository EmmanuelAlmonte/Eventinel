/**
 * useUserLocation Hook
 *
 * Handles location permission and user location acquisition.
 * Returns location, permission status, and source metadata.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';
type LocationSource = 'fresh' | 'cached' | 'default' | 'none';

export interface UseUserLocationOptions {
  /** What to do when permission denied: 'default' uses fallback, 'none' returns null */
  fallback?: 'default' | 'none';
  /** Default location [longitude, latitude] if fallback='default' */
  defaultLocation?: [number, number];
  /** Location accuracy */
  accuracy?: Location.Accuracy;
  /** Timeout for location fetch in ms (default: 5000) */
  timeout?: number;
}

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

export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationResult {
  const {
    fallback = 'none',
    defaultLocation,
    accuracy = Location.Accuracy.Balanced,
    timeout = 5000,
  } = options;

  const [location, setLocation] = useState<[number, number] | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [source, setSource] = useState<LocationSource>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Set default location IMMEDIATELY if available (UI shows instantly)
    if (fallback === 'default' && defaultLocation && !location) {
      setLocation(defaultLocation);
      setSource('default');
      setIsLoading(false); // Map shows immediately while we fetch real location in background
    }

    try {
      // Check/request permission
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
      }

      setPermission(status === 'granted' ? 'granted' : 'denied');

      if (status !== 'granted') {
        console.log('[useUserLocation] Permission denied');
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

      // Try cached location first (faster)
      try {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (cached) {
          setLocation([cached.coords.longitude, cached.coords.latitude]);
          setSource('cached');
          setIsLoading(false); // UI shows immediately with cached location
          console.log('[useUserLocation] Got cached location');
        }
      } catch (cacheError) {
        console.log('[useUserLocation] No cached location available');
      }

      // Get fresh location with timeout
      try {
        let didTimeout = false;
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy,
          ...(Platform.OS === 'android' && {
            // @ts-ignore - valid option but not in types
            forceAndroidLocationManager: true,
          }),
        });

        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            didTimeout = true;
            resolve(null);
          }, timeout);
        });

        const fresh = await Promise.race([locationPromise, timeoutPromise]);

        if (fresh && !didTimeout) {
          setLocation([fresh.coords.longitude, fresh.coords.latitude]);
          setSource('fresh');
          setIsLoading(false); // UI shows/updates with fresh location
          console.log('[useUserLocation] Got fresh location');
        } else if (!location) {
          // No cached location and fresh timed out - use fallback
          if (fallback === 'default' && defaultLocation) {
            setLocation(defaultLocation);
            setSource('default');
            setIsLoading(false); // UI shows immediately with default
          }
        }
      } catch (freshError) {
        console.log('[useUserLocation] Fresh location error:', freshError);
        // Keep cached if available, otherwise use fallback
        if (!location && fallback === 'default' && defaultLocation) {
          setLocation(defaultLocation);
          setSource('default');
          setIsLoading(false); // UI shows with fallback
        }
      }
    } catch (err) {
      console.error('[useUserLocation] Error:', err);
      setError(err instanceof Error ? err.message : 'Location error');

      if (fallback === 'default' && defaultLocation) {
        setLocation(defaultLocation);
        setSource('default');
        setIsLoading(false); // UI shows with fallback
      }
    } finally {
      // Ensure loading is always false at the end (safety net)
      setIsLoading(false);
    }
  }, [fallback, defaultLocation, accuracy, timeout, location]);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return { location, permission, source, isLoading, error, refresh: getLocation };
}
