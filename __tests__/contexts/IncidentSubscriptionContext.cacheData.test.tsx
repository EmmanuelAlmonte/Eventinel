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
import type { Severity } from '../../lib/nostr/config';

describe('IncidentSubscriptionContext cache and data', () => {
  setupIncidentSubscriptionContextTestLifecycle();
    describe('Cache Integration', () => {
      it('caches incidents from subscription', async () => {
        const mockIncidents = [
          createMockIncident('cache-test-1'),
          createMockIncident('cache-test-2'),
        ];

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: mockIncidents,
          updatedIncidents: mockIncidents,
        });

        const { getByTestId } = render(
          <TestWrapper>
            <CacheConsumer incidentId="cache-test-1" />
          </TestWrapper>
        );

        // The incident should be in the cache
        await waitFor(() => {
          expect(getByTestId('cached-incident').props.children).toBe(
            'Test Incident cache-test-1'
          );
        });
      });

      it('updates cache when incidents change', async () => {
        // Initial incidents
        const initialIncidents = [createMockIncident('dynamic-1')];
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: initialIncidents,
          updatedIncidents: initialIncidents,
        });

        const { getByTestId, rerender } = render(
          <TestWrapper>
            <CacheConsumer incidentId="dynamic-2" />
          </TestWrapper>
        );

        // Initially, dynamic-2 is not cached
        expect(getByTestId('cached-incident').props.children).toBe('Not Cached');

        // Update with new incidents
        const newIncidents = [
          createMockIncident('dynamic-1'),
          createMockIncident('dynamic-2'),
        ];
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: newIncidents,
          updatedIncidents: newIncidents,
        });

        rerender(
          <TestWrapper>
            <CacheConsumer incidentId="dynamic-2" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(getByTestId('cached-incident').props.children).toBe(
            'Test Incident dynamic-2'
          );
        });
      });

      it('does not call upsertMany when incidents array is empty', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: [],
        });

        const { getByTestId } = render(
          <TestWrapper>
            <CacheConsumer incidentId="any" />
          </TestWrapper>
        );

        // Cache version should remain 0
        expect(getByTestId('cache-version').props.children).toBe(0);
      });
    });

    describe('Incident Data', () => {
      it('provides incidents from subscription', () => {
        const mockIncidents = [
          createMockIncident('data-1'),
          createMockIncident('data-2'),
          createMockIncident('data-3'),
        ];

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: mockIncidents,
        });

        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(3);
      });

      it('updates incident count when new incidents arrive', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: [createMockIncident('first')],
        });

        const { getByTestId, rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(1);

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          incidents: [
            createMockIncident('first'),
            createMockIncident('second'),
            createMockIncident('third'),
          ],
        });

        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        expect(getByTestId('incident-count').props.children).toBe(3);
      });
    });

    describe('Severity Counts', () => {
      it('provides severity counts from subscription', () => {
        const expectedCounts: Record<Severity, number> = {
          1: 5,
          2: 10,
          3: 15,
          4: 8,
          5: 2,
        };

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          severityCounts: expectedCounts,
        });

        const { getByTestId } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        const counts = JSON.parse(getByTestId('severity-counts').props.children);
        expect(counts).toEqual(expectedCounts);
      });

      it('updates severity counts when incidents change', () => {
        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          severityCounts: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
        });

        const { getByTestId, rerender } = render(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        let counts = JSON.parse(getByTestId('severity-counts').props.children);
        expect(counts['3']).toBe(1);

        mockUseIncidentSubscription.mockReturnValue({
          ...defaultSubscriptionMock,
          severityCounts: { 1: 2, 2: 3, 3: 5, 4: 1, 5: 0 },
        });

        rerender(
          <TestWrapper>
            <SubscriptionConsumer />
          </TestWrapper>
        );

        counts = JSON.parse(getByTestId('severity-counts').props.children);
        expect(counts['3']).toBe(5);
        expect(counts['1']).toBe(2);
      });
    });
});
