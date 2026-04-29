/**
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react-native';

import {
  defaultLocation,
  denyLocationPermission,
  getLastKnownPositionAsync,
  mockLocation,
  newYorkLocation,
  renderUserLocationHook,
  resetUserLocationMocks,
} from './useUserLocationTestHarness';

describe('useUserLocation acquisition, fallback, and loading states', () => {
  beforeEach(() => {
    resetUserLocationMocks();
  });

  describe('location acquisition', () => {
    it('gets fresh location when permission granted', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual(newYorkLocation);
      });
    });

    it('returns location in [longitude, latitude] format', async () => {
      mockLocation.setCurrentPosition(39.9526, -75.1652);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.location).toEqual(defaultLocation);
      });
    });

    it('sets source to fresh when getting new location', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.source).toBe('fresh');
      });
    });

    it('checks for cached location first', async () => {
      mockLocation.setLastKnownPosition(40.7128, -74.006);

      renderUserLocationHook();

      await waitFor(() => {
        expect(getLastKnownPositionAsync).toHaveBeenCalled();
      });
    });

    it('uses cached location when available', async () => {
      mockLocation.setLastKnownPosition(40.7128, -74.006);
      mockLocation.setWatchCallbackDelay(1000);

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.source).toBe('cached');
        expect(result.current.location).toEqual(newYorkLocation);
      });
    });
  });

  describe('default location fallback', () => {
    it('uses default location when permission denied with fallback=default', async () => {
      denyLocationPermission();

      const { result } = renderUserLocationHook({
        fallback: 'default',
        defaultLocation,
      });

      await waitFor(() => {
        expect(result.current.location).toEqual(defaultLocation);
        expect(result.current.source).toBe('default');
      });
    });

    it('returns null when permission denied with fallback=none', async () => {
      denyLocationPermission();

      const { result } = renderUserLocationHook({
        fallback: 'none',
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.location).toBeNull();
      expect(result.current.source).toBe('none');
    });

    it('sets default location immediately before fetching fresh location', async () => {
      mockLocation.setWatchCallbackDelay(500);

      const { result } = renderUserLocationHook({
        fallback: 'default',
        defaultLocation,
      });

      await waitFor(
        () => {
          expect(result.current.location).toEqual(defaultLocation);
          expect(result.current.source).toBe('default');
        },
        { timeout: 100 }
      );
    });
  });

  describe('loading states', () => {
    it('sets isLoading to false after getting location', async () => {
      mockLocation.setCurrentPosition(40.7128, -74.006);

      const { result } = renderUserLocationHook();

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false after permission denied', async () => {
      denyLocationPermission();

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets isLoading to false with default location fallback', async () => {
      denyLocationPermission();

      const { result } = renderUserLocationHook({
        fallback: 'default',
        defaultLocation,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
