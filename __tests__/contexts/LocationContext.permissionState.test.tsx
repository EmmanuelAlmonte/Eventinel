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

describe('LocationContext permission and state', () => {
  setupLocationContextTestLifecycle();

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
});
