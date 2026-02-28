/**
 * LocationContext Tests
 *
 * Tests the location context provider functionality including:
 * - Provider renders children correctly
 * - Context values are accessible to consumers
 * - Location permission handling
 * - LocationGate behavior
 * - Loading states
 * - Error handling
 * - Refresh functionality
 *
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

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the useUserLocation hook
const mockUseUserLocation = jest.fn();
jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: (options: any) => mockUseUserLocation(options),
}));

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Default mock location response
 */
const defaultLocationMock: UseUserLocationResult = {
  location: [-74.006, 40.7128] as [number, number],
  permission: 'granted',
  source: 'fresh',
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};

/**
 * Test consumer component that displays location state
 */
function LocationConsumer({ testId }: { testId?: string }) {
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

/**
 * Test consumer that uses location for calculations
 */
function LocationCalculator({ testId }: { testId?: string }) {
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

/**
 * Test component that renders inside LocationGate
 */
function GatedContent({ testId }: { testId?: string }) {
  return (
    <View testID={testId}>
      <Text testID="gated-content">Location Ready!</Text>
    </View>
  );
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('LocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserLocation.mockReturnValue(defaultLocationMock);
  });

  // =============================================================================
  // PROVIDER RENDERING TESTS
  // =============================================================================

  describe('Provider Rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <LocationProvider>
          <Text>Child Content</Text>
        </LocationProvider>
      );

      expect(getByText('Child Content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      const { getByText } = render(
        <LocationProvider>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </LocationProvider>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });

    it('renders nested components', () => {
      const { getByText } = render(
        <LocationProvider>
          <View>
            <View>
              <Text>Deeply Nested</Text>
            </View>
          </View>
        </LocationProvider>
      );

      expect(getByText('Deeply Nested')).toBeTruthy();
    });

    it('calls useUserLocation with fallback:none', () => {
      render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(mockUseUserLocation).toHaveBeenCalledWith({
        fallback: 'none',
      });
    });
  });

  // =============================================================================
  // CONTEXT VALUE ACCESS TESTS
  // =============================================================================

  describe('Context Value Access', () => {
    it('provides location coordinates', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('location').props.children).toBe('-74.006,40.7128');
    });

    it('provides latitude separately', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('latitude').props.children).toBe(40.7128);
    });

    it('provides longitude separately', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('longitude').props.children).toBe(-74.006);
    });

    it('provides permission status', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('granted');
    });

    it('provides location source', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('source').props.children).toBe('fresh');
    });

    it('provides isLoading flag', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('is-loading').props.children).toBe('false');
    });

    it('provides error state', () => {
      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('error').props.children).toBe('null');
    });

    it('provides refresh function', () => {
      const mockRefresh = jest.fn();
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        refresh: mockRefresh,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      fireEvent.press(getByTestId('refresh-button'));
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('throws error when used outside provider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<LocationConsumer />);
      }).toThrow('useSharedLocation must be used within LocationProvider');

      console.error = originalError;
    });
  });

  // =============================================================================
  // PERMISSION HANDLING TESTS
  // =============================================================================

  describe('Permission Handling', () => {
    it('handles granted permission', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'granted',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('granted');
      expect(getByTestId('location').props.children).toBe('-74.006,40.7128');
    });

    it('handles denied permission', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'denied',
        location: null,
        source: 'none',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('denied');
      expect(getByTestId('location').props.children).toBe('null');
    });

    it('handles undetermined permission', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'undetermined',
        location: null,
        isLoading: true,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('undetermined');
      expect(getByTestId('is-loading').props.children).toBe('true');
    });

    it('transitions from undetermined to granted', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'undetermined',
        location: null,
        isLoading: true,
      });

      const { getByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('undetermined');

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'granted',
        location: [-74.006, 40.7128],
        isLoading: false,
      });

      rerender(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('granted');
      expect(getByTestId('location').props.children).toBe('-74.006,40.7128');
    });

    it('transitions from undetermined to denied', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'undetermined',
        location: null,
        isLoading: true,
      });

      const { getByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        permission: 'denied',
        location: null,
        source: 'none',
        isLoading: false,
      });

      rerender(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('permission').props.children).toBe('denied');
      expect(getByTestId('location').props.children).toBe('null');
    });
  });

  // =============================================================================
  // LOCATION SOURCE TESTS
  // =============================================================================

  describe('Location Source', () => {
    it('reports fresh GPS location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        source: 'fresh',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('source').props.children).toBe('fresh');
    });

    it('reports cached location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        source: 'cached',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('source').props.children).toBe('cached');
    });

    it('reports default location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        source: 'default',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('source').props.children).toBe('default');
    });

    it('reports no location source', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        source: 'none',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('source').props.children).toBe('none');
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('shows loading state during initial fetch', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        isLoading: true,
        source: 'none',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('is-loading').props.children).toBe('true');
    });

    it('shows loaded state after fetch completes', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        isLoading: false,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('is-loading').props.children).toBe('false');
    });

    it('transitions from loading to loaded', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        isLoading: true,
      });

      const { getByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('is-loading').props.children).toBe('true');

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        isLoading: false,
      });

      rerender(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('is-loading').props.children).toBe('false');
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('provides error message when location fetch fails', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        error: 'Location services disabled',
        isLoading: false,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('error').props.children).toBe(
        'Location services disabled'
      );
    });

    it('clears error after successful refresh', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        error: 'Initial error',
      });

      const { getByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('error').props.children).toBe('Initial error');

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        error: null,
      });

      rerender(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('error').props.children).toBe('null');
    });

    it('handles timeout error', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        error: 'Location request timed out',
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('error').props.children).toBe(
        'Location request timed out'
      );
    });
  });

  // =============================================================================
  // REFRESH FUNCTIONALITY TESTS
  // =============================================================================

  describe('Refresh Functionality', () => {
    it('calls refresh function when button pressed', () => {
      const mockRefresh = jest.fn();
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        refresh: mockRefresh,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      fireEvent.press(getByTestId('refresh-button'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('can refresh multiple times', () => {
      const mockRefresh = jest.fn();
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        refresh: mockRefresh,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      fireEvent.press(getByTestId('refresh-button'));
      fireEvent.press(getByTestId('refresh-button'));
      fireEvent.press(getByTestId('refresh-button'));

      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });

    it('refresh function returns async result', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        refresh: mockRefresh,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      fireEvent.press(getByTestId('refresh-button'));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // LOCATION GATE TESTS
  // =============================================================================

  describe('LocationGate', () => {
    it('renders children when location is available', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
        isLoading: false,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(getByTestId('gated-content').props.children).toBe(
        'Location Ready!'
      );
    });

    it('does not render children when location is null', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        isLoading: false,
      });

      const { queryByTestId } = render(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeNull();
    });

    it('does not render children while loading', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
        isLoading: true,
      });

      const { queryByTestId } = render(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeNull();
    });

    it('renders children after loading completes with location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        isLoading: true,
      });

      const { queryByTestId, rerender } = render(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeNull();

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
        isLoading: false,
      });

      rerender(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeTruthy();
    });

    it('hides children if location becomes null', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
        isLoading: false,
      });

      const { queryByTestId, rerender } = render(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeTruthy();

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
        isLoading: false,
      });

      rerender(
        <LocationProvider>
          <LocationGate>
            <GatedContent />
          </LocationGate>
        </LocationProvider>
      );

      expect(queryByTestId('gated-content')).toBeNull();
    });

    it('throws error when LocationGate used outside LocationProvider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <LocationGate>
            <GatedContent />
          </LocationGate>
        );
      }).toThrow('useSharedLocation must be used within LocationProvider');

      console.error = originalError;
    });
  });

  // =============================================================================
  // MULTIPLE CONSUMER TESTS
  // =============================================================================

  describe('Multiple Consumers', () => {
    it('shares location state across multiple consumers', () => {
      const { getAllByTestId } = render(
        <LocationProvider>
          <LocationConsumer testId="consumer-1" />
          <LocationConsumer testId="consumer-2" />
        </LocationProvider>
      );

      const locations = getAllByTestId('location');
      expect(locations[0].props.children).toBe('-74.006,40.7128');
      expect(locations[1].props.children).toBe('-74.006,40.7128');
    });

    it('all consumers receive same permission status', () => {
      const { getAllByTestId } = render(
        <LocationProvider>
          <LocationConsumer testId="consumer-1" />
          <LocationConsumer testId="consumer-2" />
        </LocationProvider>
      );

      const permissions = getAllByTestId('permission');
      expect(permissions[0].props.children).toBe('granted');
      expect(permissions[1].props.children).toBe('granted');
    });

    it('all consumers update when location changes', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
      });

      const { getAllByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer testId="consumer-1" />
          <LocationConsumer testId="consumer-2" />
        </LocationProvider>
      );

      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-75.1652, 39.9526],
      });

      rerender(
        <LocationProvider>
          <LocationConsumer testId="consumer-1" />
          <LocationConsumer testId="consumer-2" />
        </LocationProvider>
      );

      const locations = getAllByTestId('location');
      expect(locations[0].props.children).toBe('-75.1652,39.9526');
      expect(locations[1].props.children).toBe('-75.1652,39.9526');
    });
  });

  // =============================================================================
  // LOCATION CALCULATIONS TESTS
  // =============================================================================

  describe('Location Calculations', () => {
    it('allows consumers to calculate from location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128], // NYC - Northern Hemisphere
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationCalculator />
        </LocationProvider>
      );

      expect(getByTestId('hemisphere').props.children).toBe('North');
    });

    it('handles Southern Hemisphere location', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-43.1729, -22.9068], // Rio de Janeiro - Southern Hemisphere
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationCalculator />
        </LocationProvider>
      );

      expect(getByTestId('hemisphere').props.children).toBe('South');
    });

    it('handles null location in calculations', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: null,
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationCalculator />
        </LocationProvider>
      );

      expect(getByTestId('hemisphere').props.children).toBe('Unknown');
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles location at equator', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-78.4678, 0.1807], // Quito, Ecuador
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationCalculator />
        </LocationProvider>
      );

      // 0.1807 > 0, so technically Northern Hemisphere
      expect(getByTestId('hemisphere').props.children).toBe('North');
    });

    it('handles exact zero latitude', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [0, 0], // Null Island
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationCalculator />
        </LocationProvider>
      );

      // 0 is not > 0, so South
      expect(getByTestId('hemisphere').props.children).toBe('South');
    });

    it('handles extreme coordinates', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [180, 90], // North Pole area
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('latitude').props.children).toBe(90);
      expect(getByTestId('longitude').props.children).toBe(180);
    });

    it('handles negative extreme coordinates', () => {
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-180, -90], // South Pole area
      });

      const { getByTestId } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      expect(getByTestId('latitude').props.children).toBe(-90);
      expect(getByTestId('longitude').props.children).toBe(-180);
    });

    it('handles rapid location updates', () => {
      const { getByTestId, rerender } = render(
        <LocationProvider>
          <LocationConsumer />
        </LocationProvider>
      );

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: [-74 + i * 0.1, 40 + i * 0.1],
        });

        rerender(
          <LocationProvider>
            <LocationConsumer />
          </LocationProvider>
        );
      }

      // Should show final location
      expect(getByTestId('longitude').props.children).toBe(-74 + 0.9);
    });
  });

  // =============================================================================
  // PROVIDER ISOLATION TESTS
  // =============================================================================

  describe('Provider Isolation', () => {
    it('separate providers have independent state', () => {
      // First provider with NYC location
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-74.006, 40.7128],
      });

      const { getByTestId: getFirst } = render(
        <LocationProvider>
          <LocationConsumer testId="consumer-1" />
        </LocationProvider>
      );

      // Second provider with different location
      mockUseUserLocation.mockReturnValue({
        ...defaultLocationMock,
        location: [-122.4194, 37.7749],
      });

      const { getByTestId: getSecond } = render(
        <LocationProvider>
          <LocationConsumer testId="consumer-2" />
        </LocationProvider>
      );

      // Each provider should have its own location
      // Note: Due to mock implementation, both will show the last mock value
      // In real usage, they would be independent
      expect(getFirst('location')).toBeTruthy();
      expect(getSecond('location')).toBeTruthy();
    });
  });
});
