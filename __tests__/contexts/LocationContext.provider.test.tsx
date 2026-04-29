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

describe('LocationContext provider', () => {
  setupLocationContextTestLifecycle();

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
});
