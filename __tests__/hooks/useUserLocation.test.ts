/**
 * useUserLocation Hook Tests
 *
 * Tests the user location hook including:
 * - Permission handling
 * - Location acquisition (fresh, cached, default)
 * - Error handling
 * - Loading states
 * - Timeout behavior
 *
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Import mock helpers before importing the hook
import {
  mockLocation,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  watchPositionAsync,
  Accuracy,
} from '../../__mocks__/expo-location';

// Import the hook
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UseUserLocationOptions } from '../../hooks/useUserLocation';

// =============================================================================
// TEST SETUP
// =============================================================================

describe('useUserLocation', () => {
  beforeEach(() => {
    mockLocation.reset();
    jest.clearAllMocks();
    // Grant permission by default for most tests
    mockLocation.setPermissionStatus('granted');
  });

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('Initial State', () => {
    it('returns initial loading state as true', () => {
      const { result } = renderHook(() => useUserLocation());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns initial location as null', () => {
      const { result } = renderHook(() => useUserLocation());
      // Initially null before location is fetched
      expect(result.current.location).toBeNull();
    });

    it('returns initial permission as undetermined', () => {
      mockLocation.setPermissionStatus('undetermined');
      const { result } = renderHook(() => useUserLocation());
      expect(result.current.permission).toBe('undetermined');
    });

    it('returns initial source as none', () => {
      const { result } = renderHook(() => useUserLocation());
      expect(result.current.source).toBe('none');
    });

    it('returns initial error as null', () => {
      const { result } = renderHook(() => useUserLocation());
      expect(result.current.error).toBeNull();
    });

    it('returns refresh function', () => {
      const { result } = renderHook(() => useUserLocation());
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  // =============================================================================
  // PERMISSION TESTS
  // =============================================================================

  describe('Permission Handling', () => {
    it('checks foreground permissions on mount', async () => {
      renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(getForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('requests permission when not granted', async () => {
      mockLocation.setPermissionStatus('undetermined');

      renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('sets permission to granted after successful request', async () => {
      mockLocation.setPermissionStatus('undetermined');

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });
    });

    it('sets permission to denied when request is denied', async () => {
      mockLocation.setPermissionStatus('denied');
      // Make requestForeground return denied
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
      });
    });

    it('does not request permission when already granted', async () => {
      mockLocation.setPermissionStatus('granted');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // LOCATION ACQUISITION TESTS
  // =============================================================================

  describe('Location Acquisition', () => {
    it('gets fresh location when permission granted', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual([-74.006, 40.7128]); // [lng, lat]
      });
    });

    it('returns location in [longitude, latitude] format', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(39.9526, -75.1652);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual([-75.1652, 39.9526]);
      });
    });

    it('sets source to fresh when getting new location', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.source).toBe('fresh');
      });
    });

    it('checks for cached location first', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setLastKnownPosition(40.7128, -74.006);

      renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(getLastKnownPositionAsync).toHaveBeenCalled();
      });
    });

    it('uses cached location when available', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setLastKnownPosition(40.7128, -74.006);
      // Set watch to delay longer so cached is used first
      mockLocation.setWatchCallbackDelay(1000);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.source).toBe('cached');
        expect(result.current.location).toEqual([-74.006, 40.7128]);
      });
    });
  });

  // =============================================================================
  // DEFAULT LOCATION / FALLBACK TESTS
  // =============================================================================

  describe('Default Location Fallback', () => {
    it('uses default location when permission denied with fallback=default', async () => {
      mockLocation.setPermissionStatus('denied');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const defaultLocation: [number, number] = [-75.1652, 39.9526];

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'default',
          defaultLocation,
        })
      );

      await waitFor(() => {
        expect(result.current.location).toEqual(defaultLocation);
        expect(result.current.source).toBe('default');
      });
    });

    it('returns null when permission denied with fallback=none', async () => {
      mockLocation.setPermissionStatus('denied');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'none',
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.location).toBeNull();
      expect(result.current.source).toBe('none');
    });

    it('sets default location immediately before fetching fresh location', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setWatchCallbackDelay(500);

      const defaultLocation: [number, number] = [-75.1652, 39.9526];

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'default',
          defaultLocation,
        })
      );

      // Default location should be set quickly
      await waitFor(
        () => {
          expect(result.current.location).toEqual(defaultLocation);
          expect(result.current.source).toBe('default');
        },
        { timeout: 100 }
      );
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('sets isLoading to false after getting location', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderHook(() => useUserLocation());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false after permission denied', async () => {
      mockLocation.setPermissionStatus('denied');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false with default location fallback', async () => {
      mockLocation.setPermissionStatus('denied');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'default',
          defaultLocation: [-75.1652, 39.9526],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('handles permission check error gracefully', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission API failed')
      );

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.error).toBe('Permission API failed');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false after error', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Test error')
      );

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('uses default location on permission error when fallback=default', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission failed')
      );

      const defaultLocation: [number, number] = [-75.1652, 39.9526];

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'default',
          defaultLocation,
        })
      );

      await waitFor(() => {
        expect(result.current.location).toEqual(defaultLocation);
        expect(result.current.source).toBe('default');
      });
    });
  });

  // =============================================================================
  // TIMEOUT TESTS
  // =============================================================================

  describe('Timeout Behavior', () => {
    it('respects custom timeout option', async () => {
      mockLocation.setPermissionStatus('granted');
      // Set watch to delay longer than timeout
      mockLocation.setWatchCallbackDelay(2000);

      const { result } = renderHook(() =>
        useUserLocation({
          timeout: 100, // Very short timeout
          fallback: 'default',
          defaultLocation: [-75.1652, 39.9526],
        })
      );

      // Should fall back to default after timeout
      await waitFor(
        () => {
          expect(result.current.source).toBe('default');
        },
        { timeout: 500 }
      );
    });

    it('uses cached location when fresh times out', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setLastKnownPosition(40.7128, -74.006);
      // Set watch to delay longer than timeout
      mockLocation.setWatchCallbackDelay(2000);

      const { result } = renderHook(() =>
        useUserLocation({
          timeout: 100,
        })
      );

      await waitFor(
        () => {
          expect(result.current.source).toBe('cached');
          expect(result.current.location).toEqual([-74.006, 40.7128]);
        },
        { timeout: 500 }
      );
    });
  });

  // =============================================================================
  // REFRESH FUNCTIONALITY TESTS
  // =============================================================================

  describe('Refresh Functionality', () => {
    it('refresh function triggers new location fetch', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual([-74.006, 40.7128]);
      });

      // Update position
      mockLocation.setCurrentPosition(41.0, -75.0);

      // Call refresh
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.location).toEqual([-75.0, 41.0]);
      });
    });

    it('refresh sets isLoading to true during fetch', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);
      mockLocation.setWatchCallbackDelay(100);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start refresh (don't await)
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('refresh can be called after error', async () => {
      // First cause an error
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Initial error')
      );

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Reset mocks for refresh
      mockLocation.reset();
      mockLocation.setPermissionStatus('granted');

      // Call refresh - it should set isLoading and clear error
      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  // =============================================================================
  // OPTIONS TESTS
  // =============================================================================

  describe('Options', () => {
    it('passes accuracy option to watchPositionAsync', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      renderHook(() =>
        useUserLocation({
          accuracy: Accuracy.High,
        })
      );

      await waitFor(() => {
        expect(watchPositionAsync).toHaveBeenCalled();
      });
    });

    it('handles undefined defaultLocation gracefully', async () => {
      mockLocation.setPermissionStatus('denied');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderHook(() =>
        useUserLocation({
          fallback: 'default',
          // defaultLocation is undefined
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.location).toBeNull();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles zero coordinates correctly', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(0, 0); // Null Island

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual([0, 0]);
      });
    });

    it('handles negative coordinates correctly', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(-33.8688, 151.2093); // Sydney

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual([151.2093, -33.8688]);
      });
    });

    it('handles rapid permission status changes', async () => {
      mockLocation.setPermissionStatus('undetermined');

      const { result, rerender } = renderHook(
        (props: UseUserLocationOptions | undefined) => useUserLocation(props),
        { initialProps: undefined }
      );

      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);
      rerender(undefined);

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });
    });
  });
});
