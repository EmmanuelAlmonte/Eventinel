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
  mockUseStartupNavigationInteraction,
  mockUseUserLocation,
  releaseInitialSubscriptionLocationGate,
  setupIncidentSubscriptionContextTestLifecycle,
  render,
  SubscriptionConsumer,
  TestWrapper,
  TestWrapperWithoutFocus,
  Text,
  useSharedIncidents,
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

      it('does not restart the initial subscription delay on repeated location fixes', async () => {
        jest.useFakeTimers();
        const initialLocation: [number, number] = [-74.006, 40.7128];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: initialLocation,
        });

        const { rerender } = render(
          <TestWrapperWithoutFocus>
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        act(() => {
          jest.advanceTimersByTime(4000);
        });

        const freshLocation: [number, number] = [-75.1652, 39.9526];
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: freshLocation,
        });

        rerender(
          <TestWrapperWithoutFocus>
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: false,
            location: freshLocation,
          })
        );

        act(() => {
          jest.advanceTimersByTime(4000);
        });

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: true,
            location: freshLocation,
          })
        );
      });

      it('shortens the initial subscription delay after startup tab interaction', async () => {
        jest.useFakeTimers();
        mockUseStartupNavigationInteraction.mockReturnValue({
          hasStartupMapRequest: false,
          lastStartupTabInteractionAt: null,
          markStartupTabInteraction: jest.fn(),
        });

        const { rerender } = render(
          <TestWrapperWithoutFocus>
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        act(() => {
          jest.advanceTimersByTime(4000);
        });

        mockUseStartupNavigationInteraction.mockReturnValue({
          hasStartupMapRequest: false,
          lastStartupTabInteractionAt: Date.now(),
          markStartupTabInteraction: jest.fn(),
        });

        rerender(
          <TestWrapperWithoutFocus>
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );

        act(() => {
          jest.advanceTimersByTime(2999);
        });

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );

        act(() => {
          jest.advanceTimersByTime(1);
        });

        expect(mockUseIncidentSubscription).toHaveBeenLastCalledWith(
          expect.objectContaining({
            enabled: true,
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

      it('ignores duplicate map viewport targets with equal coordinates', () => {
        jest.useFakeTimers();
        const mapAnchor: [number, number] = [-75.0513433, 40.0383633];
        const mapViewport = {
          center: mapAnchor,
          bounds: {
            ne: [-75.0, 40.08] as [number, number],
            sw: [-75.1, 40.0] as [number, number],
          },
          zoom: 14,
        };
        let capturedSetters:
          | Pick<
              ReturnType<typeof useSharedIncidents>,
              | 'setMapFocused'
              | 'setMapSubscriptionAnchor'
              | 'setMapSubscriptionViewport'
            >
          | null = null;

        function CaptureMapSubscriptionSetters() {
          const {
            setMapFocused,
            setMapSubscriptionAnchor,
            setMapSubscriptionViewport,
          } = useSharedIncidents();
          capturedSetters = {
            setMapFocused,
            setMapSubscriptionAnchor,
            setMapSubscriptionViewport,
          };
          return null;
        }

        render(
          <TestWrapperWithoutFocus>
            <CaptureMapSubscriptionSetters />
            <SubscriptionConsumer />
          </TestWrapperWithoutFocus>
        );

        releaseInitialSubscriptionLocationGate();

        act(() => {
          capturedSetters?.setMapFocused(true);
        });
        act(() => {
          capturedSetters?.setMapSubscriptionAnchor(mapAnchor);
        });
        act(() => {
          capturedSetters?.setMapSubscriptionViewport(mapViewport);
        });

        act(() => {
          capturedSetters?.setMapSubscriptionAnchor([mapAnchor[0], mapAnchor[1]]);
        });
        const duplicateViewport = {
          center: [mapAnchor[0], mapAnchor[1]] as [number, number],
          bounds: {
            ne: [mapViewport.bounds.ne[0], mapViewport.bounds.ne[1]] as [
              number,
              number,
            ],
            sw: [mapViewport.bounds.sw[0], mapViewport.bounds.sw[1]] as [
              number,
              number,
            ],
          },
          zoom: mapViewport.zoom,
        };
        act(() => {
          capturedSetters?.setMapSubscriptionViewport(duplicateViewport);
        });

        const lastSubscriptionOptions =
          mockUseIncidentSubscription.mock.calls[
            mockUseIncidentSubscription.mock.calls.length - 1
          ][0];
        expect(lastSubscriptionOptions.subscriptionLocation).toBe(mapAnchor);
        expect(lastSubscriptionOptions.subscriptionViewport).toBe(mapViewport);
        expect(lastSubscriptionOptions.subscriptionViewport).not.toBe(duplicateViewport);
      });
    });
});
