/**
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react-native';

import {
  getForegroundPermissionsAsync,
  mockLocation,
  renderUserLocationHook,
  requestForegroundPermissionsAsync,
  resetUserLocationMocks,
} from './useUserLocationTestHarness';

describe('useUserLocation initial state and permissions', () => {
  beforeEach(() => {
    resetUserLocationMocks();
  });

  describe('initial state', () => {
    it('returns initial loading state as true', () => {
      const { result } = renderUserLocationHook();
      expect(result.current.isLoading).toBe(true);
    });

    it('returns initial location as null', () => {
      const { result } = renderUserLocationHook();
      expect(result.current.location).toBeNull();
    });

    it('returns initial permission as undetermined', () => {
      mockLocation.setPermissionStatus('undetermined');
      const { result } = renderUserLocationHook();
      expect(result.current.permission).toBe('undetermined');
    });

    it('returns initial source as none', () => {
      const { result } = renderUserLocationHook();
      expect(result.current.source).toBe('none');
    });

    it('returns initial error as null', () => {
      const { result } = renderUserLocationHook();
      expect(result.current.error).toBeNull();
    });

    it('returns refresh function', () => {
      const { result } = renderUserLocationHook();
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('permission handling', () => {
    it('checks foreground permissions on mount', async () => {
      renderUserLocationHook();

      await waitFor(() => {
        expect(getForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('requests permission when not granted', async () => {
      mockLocation.setPermissionStatus('undetermined');

      renderUserLocationHook();

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('sets permission to granted after successful request', async () => {
      mockLocation.setPermissionStatus('undetermined');

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });
    });

    it('sets permission to denied when request is denied', async () => {
      mockLocation.setPermissionStatus('denied');
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const { result } = renderUserLocationHook();

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
      });
    });

    it('does not request permission when already granted', async () => {
      mockLocation.setPermissionStatus('granted');
      (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      renderUserLocationHook();

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      });
    });
  });
});
