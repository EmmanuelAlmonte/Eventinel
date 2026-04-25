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

describe('IncidentSubscriptionContext loading and consumers', () => {
  setupIncidentSubscriptionContextTestLifecycle();
    describe('Loading States', () => {
      it('shows initial loading state before EOSE', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          isInitialLoading: true,
          hasReceivedHistory: false,
        });
  
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );
  
        expect(getByTestId('is-loading').props.children).toBe('true');
        expect(getByTestId('has-history').props.children).toBe('false');
      });
  
      it('shows loaded state after EOSE', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          isInitialLoading: false,
          hasReceivedHistory: true,
        });
  
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );
  
        expect(getByTestId('is-loading').props.children).toBe('false');
        expect(getByTestId('has-history').props.children).toBe('true');
      });
  
      it('transitions from loading to loaded', () => {
        // Start loading
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          isInitialLoading: true,
          hasReceivedHistory: false,
        });
  
        const { getByTestId, rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );
  
        expect(getByTestId('is-loading').props.children).toBe('true');
  
        // Finish loading
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          isInitialLoading: false,
          hasReceivedHistory: true,
        });
  
        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );
  
        expect(getByTestId('is-loading').props.children).toBe('false');
        expect(getByTestId('has-history').props.children).toBe('true');
      });
    });
  
    describe('Multiple Consumers', () => {
      it('shares subscription state across multiple consumers', () => {
        const mockIncidents = [
          createMockIncident('shared-1'),
          createMockIncident('shared-2'),
        ];
  
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: mockIncidents,
        });
  
        const { getAllByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer testId="consumer-1" />
            <SubscriptionConsumer testId="consumer-2" />
          </TestWrapper>
        );
  
        const counts = getAllByTestId('incident-count');
        expect(counts[0].props.children).toBe(2);
        expect(counts[1].props.children).toBe(2);
      });
  
      it('all consumers receive same loading state', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          isInitialLoading: true,
        });
  
        const { getAllByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer testId="consumer-1" />
            <SubscriptionConsumer testId="consumer-2" />
          </TestWrapper>
        );
  
        const loadingStates = getAllByTestId('is-loading');
        expect(loadingStates[0].props.children).toBe('true');
        expect(loadingStates[1].props.children).toBe('true');
      });
    });
});

