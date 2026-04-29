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

describe('LocationContext gate', () => {
  setupLocationContextTestLifecycle();

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
});
