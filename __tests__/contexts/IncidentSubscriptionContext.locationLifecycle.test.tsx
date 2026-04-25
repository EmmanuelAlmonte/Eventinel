/**
 * @jest-environment jsdom
 */

import {
  act,
  CacheConsumer,
  createMockIncident,
  defaultLocationMock,
  defaultSubscriptionMock,
  FocusController,
  FocusSetter,
  IncidentCacheProvider,
  IncidentSubscriptionProvider,
  InteractionManager,
  LocationConsumer,
  LocationProvider,
  mockUseIncidentHistoryWindow,
  mockUseIncidentSubscription,
  mockUseUserLocation,
  releaseInitialSubscriptionLocationGate,
  setupIncidentSubscriptionContextTestLifecycle,
  render,
  SubscriptionConsumer,
  TestWrapper,
  TestWrapperWithoutFocus,
  Text,
  View,
  waitFor,
} from './incidentSubscriptionContextTestHarness';

describe('IncidentSubscriptionContext location and lifecycle', () => {
  setupIncidentSubscriptionContextTestLifecycle();
    describe('Location Integration', () => {
      it('passes location to useIncidentSubscription', () => {
        const mockLocation: [number, number] = [-75.1652, 39.9526];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: mockLocation,
        });

        render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            location: mockLocation,
            sinceDays: 30,
          })
        );
      });

      it('disables subscription when location is null', () => {
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: null,
        });

        render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            location: null,
            enabled: false,
            sinceDays: 30,
          })
        );
      });

      it('passes the updated location through when location becomes available', () => {
        // Start with null location
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: null,
          isLoading: true,
        });

        const { rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );

        // Update location
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: [-74.006, 40.7128],
          isLoading: false,
        });

        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            location: [-74.006, 40.7128],
            sinceDays: 30,
          })
        );
      });

      it('disables subscription while the history window preference is still loading', () => {
        mockUseIncidentHistoryWindow.mockReturnValue({
          historyWindowDays: 7,
          isReady: false,
          setHistoryWindowDays: jest.fn().mockResolvedValue(undefined),
        });

        render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
            sinceDays: 7,
          })
        );
      });
    });

    describe('Subscription Lifecycle', () => {
      it('creates subscription only once with stable location', () => {
        const mockLocation: [number, number] = [-74.006, 40.7128];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: mockLocation,
        });

        const { rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        const callCount = mockUseIncidentSubscription.mock.calls.length;

        // Re-render without changing location
        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        // Hook should be called again but with same params
        expect(mockUseIncidentSubscription).toHaveBeenCalledTimes(callCount + 1);
      });

      it('updates subscription when location changes', () => {
        const location1: [number, number] = [-74.006, 40.7128];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: location1,
        });

        const { rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            location: location1,
          })
        );

        const location2: [number, number] = [-75.1652, 39.9526];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: location2,
        });

        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            location: location2,
          })
        );
      });

      it('keeps subscriptions enabled when no incident surface is focused', async () => {
        jest.useFakeTimers();
        render(
          <TestWrapperWithoutFocus>
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        releaseInitialSubscriptionLocationGate();

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: true,
            location: defaultLocationMock.location,
          })
        );
      });

      it('keeps the last map viewport target when leaving map for a non-incident tab', async () => {
        jest.useFakeTimers();
        const mapAnchor: [number, number] = [-73.9857, 40.7484];
        const mapViewport = {
          center: mapAnchor,
          bounds: {
            ne: [-73.9, 40.8] as [number, number],
            sw: [-74.1, 40.7] as [number, number],
          },
          zoom: 12,
        };

        const { rerender } = render(
          <TestWrapperWithoutFocus>
            <FocusController
              mapFocused
              mapAnchor={mapAnchor}
              mapViewport={mapViewport}
            />
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        releaseInitialSubscriptionLocationGate();

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            subscriptionLocation: mapAnchor,
            subscriptionViewport: mapViewport,
          })
        );

        rerender(
          <TestWrapperWithoutFocus>
            <FocusController
              mapFocused={false}
              feedFocused={false}
              mapAnchor={mapAnchor}
              mapViewport={mapViewport}
            />
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: true,
            subscriptionLocation: mapAnchor,
            subscriptionViewport: mapViewport,
          })
        );
      });
    });
});
