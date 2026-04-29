/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, View, Button } from 'react-native';

import {
  LocationProvider,
  useSharedLocation,
  LocationGate,
} from '../../contexts/LocationContext';
import type { UseUserLocationResult } from '../../hooks/useUserLocation';

// Mock the useUserLocation hook
export const mockUseUserLocation = jest.fn();
jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: (options: any) => mockUseUserLocation(options),
}));


export const defaultLocationMock: UseUserLocationResult = {
  location: [-74.006, 40.7128] as [number, number],
  permission: 'granted',
  source: 'fresh',
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};


export function LocationConsumer({ testId }: { testId?: string }) {
  const { location, permission, source, isLoading, error, refresh } =
    useSharedLocation();

  return (
    <View testID={testId}>
      <Text testID="location">{location ? location.join(',') : 'null'}</Text>
      <Text testID="latitude">{location ? location[1] : 'null'}</Text>
      <Text testID="longitude">{location ? location[0] : 'null'}</Text>
      <Text testID="permission">{permission}</Text>
      <Text testID="source">{source}</Text>
      <Text testID="is-loading">{String(isLoading)}</Text>
      <Text testID="error">{error || 'null'}</Text>
      <Button testID="refresh-button" title="Refresh" onPress={refresh} />
    </View>
  );
}


export function LocationCalculator({ testId }: { testId?: string }) {
  const { location } = useSharedLocation();

  // Simple calculation: check if location is in Northern Hemisphere
  const isNorthernHemisphere = location ? location[1] > 0 : null;

  return (
    <View testID={testId}>
      <Text testID="hemisphere">
        {isNorthernHemisphere === null
          ? 'Unknown'
          : isNorthernHemisphere
            ? 'North'
            : 'South'}
      </Text>
    </View>
  );
}


export function GatedContent({ testId }: { testId?: string }) {
  return (
    <View testID={testId}>
      <Text testID="gated-content">Location Ready!</Text>
    </View>
  );
}


export function setupLocationContextTestLifecycle() {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserLocation.mockReturnValue(defaultLocationMock);
  });
}

export { render, act, waitFor, fireEvent };
export { Text, View, Button };
export { LocationProvider, useSharedLocation, LocationGate };
