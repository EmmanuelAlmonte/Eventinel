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

describe('LocationContext errors and refresh', () => {
  setupLocationContextTestLifecycle();

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
});
