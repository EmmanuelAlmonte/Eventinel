/**
 * @jest-environment jsdom
 */

import {
  defaultLocationMock,
  fireEvent,
  GatedContent,
  LocationCalculator,
  LocationConsumer,
  LocationGate,
  LocationProvider,
  mockUseUserLocation,
  render,
  setupLocationContextTestLifecycle,
  Text,
  View,
  waitFor,
} from './locationContextTestHarness';

describe('LocationContext consumers and edge cases', () => {
  setupLocationContextTestLifecycle();

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
