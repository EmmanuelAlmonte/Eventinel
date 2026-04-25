import { renderHook } from '@testing-library/react-native';

import {
  mockLocation,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  watchPositionAsync,
  Accuracy,
} from '../../__mocks__/expo-location';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UseUserLocationOptions } from '../../hooks/useUserLocation';

export const defaultLocation: [number, number] = [-75.1652, 39.9526];
export const newYorkLocation: [number, number] = [-74.006, 40.7128];

export function resetUserLocationMocks() {
  mockLocation.reset();
  jest.clearAllMocks();
  mockLocation.setPermissionStatus('granted');
}

export function denyLocationPermission() {
  mockLocation.setPermissionStatus('denied');
  (getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });
  (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });
}

export function renderUserLocationHook(options?: UseUserLocationOptions) {
  return renderHook(() => useUserLocation(options));
}

export {
  Accuracy,
  getForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  mockLocation,
  requestForegroundPermissionsAsync,
  useUserLocation,
  watchPositionAsync,
};

export type { UseUserLocationOptions };
