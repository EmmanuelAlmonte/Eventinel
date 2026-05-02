/**
 * @jest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import {
  Accuracy,
  defaultLocation,
  denyLocationPermission,
  getForegroundPermissionsAsync,
  mockLocation,
  renderUserLocationHook,
  requestForegroundPermissionsAsync,
  resetUserLocationMocks,
  useUserLocation,
  watchPositionAsync,
} from './useUserLocationTestHarness';
import type { UseUserLocationOptions } from './useUserLocationTestHarness';

describe('useUserLocation errors, refresh, options, and edge cases', () => {
  beforeEach(() => {
    resetUserLocationMocks();
  });

  describe('error handling', () => {
    it('handles permission check error gracefully', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission API failed')
      );

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.error).toBe('Permission API failed');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false after error', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Test error')
      );

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('uses default location on permission error when fallback=default', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission failed')
      );

      const { result } = renderUserLocationHook({
        fallback: 'default',
        defaultLocation,
      });

      await waitFor(() => {
        expect(result.current.location).toEqual(defaultLocation);
        expect(result.current.source).toBe('default');
      });
    });
  });

  describe('timeout behavior', () => {
    it('respects custom timeout option', async () => {
      mockLocation.setWatchCallbackDelay(2000);

      const { result } = renderUserLocationHook({
        timeout: 100,
        fallback: 'default',
        defaultLocation,
      });

      await waitFor(
        () => {
          expect(result.current.source).toBe('default');
        },
        { timeout: 500 }
      );
    });

    it('uses cached location when fresh times out', async () => {
      mockLocation.setLastKnownPosition(40.7128, -74.006);
      mockLocation.setWatchCallbackDelay(2000);

      const { result } = renderUserLocationHook({
        timeout: 100,
      });

      await waitFor(
        () => {
          expect(result.current.source).toBe('cached');
          expect(result.current.location).toEqual([-74.006, 40.7128]);
        },
        { timeout: 500 }
      );
    });
  });

  describe('refresh functionality', () => {
    it('refresh function triggers new location fetch', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual([-74.006, 40.7128]);
      });

      mockLocation.setCurrentPosition(41.0, -75.0);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.location).toEqual([-75.0, 41.0]);
      });
    });

    it('refresh sets isLoading to true during fetch', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);
      mockLocation.setWatchCallbackDelay(100);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('refresh can be called after error', async () => {
      (getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Initial error')
      );

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockLocation.reset();
      mockLocation.setPermissionStatus('granted');

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('clears stale coordinates when refresh finds permission denied', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual([-74.006, 40.7128]);
        expect(result.current.permission).toBe('granted');
      });

      mockLocation.setPermissionStatus('denied');

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
        expect(result.current.location).toBeNull();
        expect(result.current.source).toBe('none');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('runtime permission updates', () => {
    let appStateChangeListener: ((nextState: AppStateStatus) => void) | null = null;
    let appStateSubscriptionRemove: jest.Mock;

    beforeEach(() => {
      appStateChangeListener = null;
      appStateSubscriptionRemove = jest.fn();

      Object.defineProperty(AppState, 'currentState', {
        value: 'active',
        configurable: true,
      });

      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener: any) => {
        appStateChangeListener = listener;
        return {
          remove: appStateSubscriptionRemove,
        } as any;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    function triggerAppState(nextState: AppStateStatus) {
      if (!appStateChangeListener) {
        throw new Error('AppState listener was not registered');
      }

      act(() => {
        appStateChangeListener?.(nextState);
      });
    }

    it('clears stale coordinates after foreground permission is revoked while app is running', async () => {
      mockLocation.setPermissionStatus('granted');
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual([-74.006, 40.7128]);
        expect(result.current.permission).toBe('granted');
      });

      expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();

      mockLocation.setPermissionStatus('denied');
      triggerAppState('background');
      triggerAppState('active');

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
        expect(result.current.location).toBeNull();
        expect(result.current.source).toBe('none');
        expect(result.current.isLoading).toBe(false);
      });

      expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('options', () => {
    it('passes accuracy option to watchPositionAsync', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      renderUserLocationHook({
        accuracy: Accuracy.High,
      });

      await waitFor(() => {
        expect(watchPositionAsync).toHaveBeenCalled();
      });
    });

    it('handles undefined defaultLocation gracefully', async () => {
      denyLocationPermission();

      const { result } = renderUserLocationHook({
        fallback: 'default',
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.location).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles zero coordinates correctly', async () => {
      mockLocation.setCurrentPosition(0, 0);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual([0, 0]);
      });
    });

    it('handles negative coordinates correctly', async () => {
      mockLocation.setCurrentPosition(-33.8688, 151.2093);

      const { result } = renderUserLocationHook();

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
