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

describe('IncidentSubscriptionContext edge cases', () => {
  setupIncidentSubscriptionContextTestLifecycle();
    describe('Edge Cases', () => {
      it('handles rapid incident updates', () => {
        const { getByTestId, rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        // Simulate rapid updates
        for (let i = 0; i < 10; i++) {
          mockUseIncidentSubscription.mockReturnValue({
            ...defaultSubscriptionMock,
            incidents: Array(i + 1)
              .fill(null)
              .map((_, j) => createMockIncident(`rapid-${j}`)),
          });

          rerender(
            <TestWrapper>
              <SubscriptionConsumer />
            </TestWrapper>
          );
        }

        expect(getByTestId('incident-count').props.children).toBe(10);
      });

      it('handles empty incidents after having incidents', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: [createMockIncident('temp-1'), createMockIncident('temp-2')],
        });

        const { getByTestId, rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(2);

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: [],
        });

        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(0);
      });

      it('handles location permission denied', () => {
        mockUseUserLocation.mockReturnValue({
          ...defaultLocationMock,
          location: null,
          permission: 'denied',
          isLoading: false,
        });

        const { getByTestId } = render(
          <TestWrapper>
            <LocationConsumer />
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('permission').props.children).toBe('denied');
        expect(mockUseIncidentSubscription).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );
      });
    });
});
