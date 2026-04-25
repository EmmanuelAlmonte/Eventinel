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

describe('IncidentSubscriptionContext provider', () => {
  setupIncidentSubscriptionContextTestLifecycle();
    describe('Provider Rendering', () => {
      it('renders children correctly', () => {
        const { getByText } = render(
          <TestWrapper>
            <Text>Child Content</Text>
          </TestWrapper>
        );

        expect(getByText('Child Content')).toBeTruthy();
      });

      it('renders multiple children', () => {
        const { getByText } = render(
          <TestWrapper>
            <Text>First Child</Text>
            <Text>Second Child</Text>
          </TestWrapper>
        );

        expect(getByText('First Child')).toBeTruthy();
        expect(getByText('Second Child')).toBeTruthy();
      });

      it('renders nested components', () => {
        const { getByText } = render(
          <TestWrapper>
            <View>
              <View>
                <Text>Deeply Nested</Text>
              </View>
            </View>
          </TestWrapper>
        );

        expect(getByText('Deeply Nested')).toBeTruthy();
      });
    });

    describe('Context Value Access', () => {
      it('provides incidents array', () => {
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(0);
      });

      it('provides isInitialLoading flag', () => {
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('is-loading').props.children).toBe('false');
      });

      it('provides hasReceivedHistory flag', () => {
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('has-history').props.children).toBe('true');
      });

      it('provides severityCounts object', () => {
        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        const counts = JSON.parse(getByTestId('severity-counts').props.children);
        expect(counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      });

      it('throws error when used outside provider', () => {
        const originalError = console.error;
        console.error = jest.fn();

        expect(() => {
          render(<SubscriptionConsumer />);
        }).toThrow(
          'useSharedIncidents must be used within IncidentSubscriptionProvider'
        );

        console.error = originalError;
      });
    });

    describe('Context Nesting Order', () => {
      it('requires LocationProvider as ancestor', () => {
        const originalError = console.error;
        console.error = jest.fn();

        // This should fail because LocationProvider is missing
        expect(() => {
          render(
            <IncidentCacheProvider>
              <IncidentSubscriptionProvider>
                <SubscriptionConsumer />
              </IncidentSubscriptionProvider>
            </IncidentCacheProvider>
          );
        }).toThrow('useSharedLocation must be used within LocationProvider');

        console.error = originalError;
      });

      it('requires IncidentCacheProvider as ancestor', () => {
        const originalError = console.error;
        console.error = jest.fn();

        // This should fail because IncidentCacheProvider is missing
        expect(() => {
          render(
            <LocationProvider>
              <IncidentSubscriptionProvider>
                <SubscriptionConsumer />
              </IncidentSubscriptionProvider>
            </LocationProvider>
          );
        }).toThrow('useIncidentCache must be used within IncidentCacheProvider');

        console.error = originalError;
      });
    });
});
