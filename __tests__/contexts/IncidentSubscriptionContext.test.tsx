/**
 * IncidentSubscriptionContext Tests
 *
 * Tests the incident subscription context provider functionality including:
 * - Provider renders children correctly
 * - Context values are accessible to consumers
 * - Subscription lifecycle management
 * - Integration with LocationContext
 * - Integration with IncidentCacheContext
 * - Loading states and data flow
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import {
  IncidentSubscriptionProvider,
  useSharedIncidents,
} from '../../contexts/IncidentSubscriptionContext';
import {
  LocationProvider,
  useSharedLocation,
} from '../../contexts/LocationContext';
import {
  IncidentCacheProvider,
  useIncidentCache,
} from '../../contexts/IncidentCacheContext';
import type { ProcessedIncident } from '../../hooks/useIncidentSubscription';
import type { Severity } from '../../lib/nostr/config';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the useIncidentSubscription hook
const mockUseIncidentSubscription = jest.fn();
jest.mock('../../hooks', () => ({
  useIncidentSubscription: (options: any) => mockUseIncidentSubscription(options),
}));

// Mock the useUserLocation hook used by LocationProvider
const mockUseUserLocation = jest.fn();
jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: (options: any) => mockUseUserLocation(options),
}));

// Mock relay status to keep subscriptions enabled in tests
jest.mock('../../contexts/RelayStatusContext', () => ({
  useRelayStatus: () => ({
    hasConnectedRelay: true,
    hasRelays: true,
    isConnecting: false,
    relays: [],
    stats: { total: 1, connected: 1, connecting: 0, disconnected: 0 },
  }),
}));

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock ProcessedIncident for testing
 */
function createMockIncident(
  id: string,
  severity: Severity = 3,
  overrides: Partial<ProcessedIncident> = {}
): ProcessedIncident {
  const createdAt = Math.floor(Date.now() / 1000);
  const occurredAt = new Date(createdAt * 1000);
  return {
    incidentId: id,
    eventId: `event_${id}`,
    pubkey: 'test_pubkey_123',
    title: `Test Incident ${id}`,
    description: `Description for incident ${id}`,
    type: 'fire',
    severity,
    createdAt,
    createdAtMs: createdAt * 1000,
    occurredAt,
    occurredAtMs: occurredAt.getTime(),
    location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Test St',
      city: 'New York',
      state: 'NY',
      geohash: 'dr5r',
    },
    source: 'community',
    sourceId: `source_${id}`,
    isVerified: false,
    ...overrides,
  };
}

/**
 * Default mock location response
 */
const defaultLocationMock = {
  location: [-74.006, 40.7128] as [number, number],
  permission: 'granted' as const,
  source: 'fresh' as const,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};

/**
 * Default mock subscription response
 */
const defaultSubscriptionMock = {
  incidents: [] as ProcessedIncident[],
  isInitialLoading: false,
  hasReceivedHistory: true,
  severityCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Severity, number>,
  totalEventsReceived: 0,
  lastUpdatedAt: null,
};

/**
 * Test consumer component that displays subscription state
 */
function SubscriptionConsumer({ testId }: { testId?: string }) {
  const { incidents, isInitialLoading, hasReceivedHistory, severityCounts } =
    useSharedIncidents();

  return (
    <View testID={testId}>
      <Text testID="incident-count">{incidents.length}</Text>
      <Text testID="is-loading">{String(isInitialLoading)}</Text>
      <Text testID="has-history">{String(hasReceivedHistory)}</Text>
      <Text testID="severity-counts">{JSON.stringify(severityCounts)}</Text>
    </View>
  );
}

/**
 * Test consumer for location context
 */
function LocationConsumer({ testId }: { testId?: string }) {
  const { location, isLoading, permission } = useSharedLocation();

  return (
    <View testID={testId}>
      <Text testID="location">{location ? location.join(',') : 'null'}</Text>
      <Text testID="location-loading">{String(isLoading)}</Text>
      <Text testID="permission">{permission}</Text>
    </View>
  );
}

/**
 * Test consumer for cache context
 */
function CacheConsumer({
  incidentId,
  testId,
}: {
  incidentId: string;
  testId?: string;
}) {
  const { getIncident, version } = useIncidentCache();
  const incident = getIncident(incidentId);

  return (
    <View testID={testId}>
      <Text testID="cached-incident">{incident?.title || 'Not Cached'}</Text>
      <Text testID="cache-version">{version}</Text>
    </View>
  );
}

/**
 * Wrapper component that provides all required contexts
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <IncidentCacheProvider>
        <IncidentSubscriptionProvider>{children}</IncidentSubscriptionProvider>
      </IncidentCacheProvider>
    </LocationProvider>
  );
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('IncidentSubscriptionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserLocation.mockReturnValue(defaultLocationMock);
    mockUseIncidentSubscription.mockReturnValue(defaultSubscriptionMock);
  });

  // =============================================================================
  // PROVIDER RENDERING TESTS
  // =============================================================================

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

  // =============================================================================
  // CONTEXT VALUE ACCESS TESTS
  // =============================================================================

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

  // =============================================================================
  // LOCATION INTEGRATION TESTS
  // =============================================================================

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
          enabled: true,
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
        })
      );
    });

    it('enables subscription when location becomes available', () => {
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
          enabled: true,
        })
      );
    });
  });

  // =============================================================================
  // CACHE INTEGRATION TESTS
  // =============================================================================

  describe('Cache Integration', () => {
    it('caches incidents from subscription', async () => {
      const mockIncidents = [
        createMockIncident('cache-test-1'),
        createMockIncident('cache-test-2'),
      ];

      mockUseIncidentSubscription.mockReturnValue({
        ...defaultSubscriptionMock,
        incidents: mockIncidents,
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

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

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

  // =============================================================================
  // INCIDENT DATA TESTS
  // =============================================================================

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

  // =============================================================================
  // SEVERITY COUNTS TESTS
  // =============================================================================

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

  // =============================================================================
  // MULTIPLE CONSUMER TESTS
  // =============================================================================

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

  // =============================================================================
  // SUBSCRIPTION LIFECYCLE TESTS
  // =============================================================================

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
      expect(mockUseIncidentSubscription).toHaveBeenCalledTimes(callCount * 2);
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
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

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

  // =============================================================================
  // CONTEXT NESTING ORDER TESTS
  // =============================================================================

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
