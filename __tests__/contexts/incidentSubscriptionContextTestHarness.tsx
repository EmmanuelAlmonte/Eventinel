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

import React, { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { InteractionManager, Text, View } from 'react-native';

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
import { buildProcessedIncident } from '../fixtures/incident/buildIncident';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the useIncidentSubscription hook
export const mockUseIncidentSubscription = jest.fn();
jest.mock('../../hooks', () => ({
  useIncidentSubscription: (options: any) => mockUseIncidentSubscription(options),
}));

// Mock the useUserLocation hook used by LocationProvider
export const mockUseUserLocation = jest.fn();
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

export const mockUseIncidentHistoryWindow = jest.fn(() => ({
  historyWindowDays: 30,
  isReady: true,
  setHistoryWindowDays: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../contexts/IncidentHistoryWindowContext', () => ({
  useIncidentHistoryWindow: () => mockUseIncidentHistoryWindow(),
}));

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock ProcessedIncident for testing
 */
export function createMockIncident(
  id: string,
  severity: Severity = 3,
  overrides: Partial<ProcessedIncident> = {}
): ProcessedIncident {
  const createdAt = Math.floor(Date.now() / 1000);
  const occurredAt = new Date(createdAt * 1000);
  return buildProcessedIncident(id, {
    eventId: `event_${id}`,
    pubkey: 'test_pubkey_123',
    title: `Test Incident ${id}`,
    description: `Description for incident ${id}`,
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
    sourceId: `source_${id}`,
    ...overrides,
  });
}

/**
 * Default mock location response
 */
export const defaultLocationMock = {
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
export const defaultSubscriptionMock = {
  incidents: [] as ProcessedIncident[],
  isInitialLoading: false,
  hasReceivedHistory: true,
  severityCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Severity, number>,
  updatedIncidents: [] as ProcessedIncident[],
  totalEventsReceived: 0,
  lastUpdatedAt: null,
};

const INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS = 8000;

export function setupIncidentSubscriptionContextTestLifecycle() {
  const originalSetImmediate = global.setImmediate;
  let runAfterInteractionsSpy: jest.SpiedFunction<
    typeof InteractionManager.runAfterInteractions
  >;

  beforeAll(() => {
    if (typeof global.setImmediate !== 'function') {
      global.setImmediate = ((callback: (...args: any[]) => void, ...args: any[]) =>
        setTimeout(callback, 0, ...args)) as unknown as typeof setImmediate;
    }

    runAfterInteractionsSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }

        return {
          cancel: jest.fn(),
        } as unknown as ReturnType<typeof InteractionManager.runAfterInteractions>;
      });
  });

  afterAll(() => {
    runAfterInteractionsSpy.mockRestore();
    global.setImmediate = originalSetImmediate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserLocation.mockReturnValue(defaultLocationMock);
    mockUseIncidentSubscription.mockReturnValue(defaultSubscriptionMock);
    mockUseIncidentHistoryWindow.mockReturnValue({
      historyWindowDays: 30,
      isReady: true,
      setHistoryWindowDays: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}

export function releaseInitialSubscriptionLocationGate() {
  act(() => {
    jest.advanceTimersByTime(INITIAL_SUBSCRIPTION_LOCATION_DELAY_MS);
  });
}

/**
 * Test consumer component that displays subscription state
 */
export function SubscriptionConsumer({ testId }: { testId?: string }) {
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
 * Test helper to mark the Map screen as focused for subscription gating.
 */
export function FocusSetter() {
  const { setMapFocused } = useSharedIncidents();

  useEffect(() => {
    setMapFocused(true);
    return () => {
      setMapFocused(false);
    };
  }, [setMapFocused]);

  return null;
}

export function FocusController({
  mapFocused = false,
  feedFocused = false,
  mapAnchor = null,
  mapViewport = null,
}: {
  mapFocused?: boolean;
  feedFocused?: boolean;
  mapAnchor?: [number, number] | null;
  mapViewport?: {
    center: [number, number];
    bounds: {
      ne: [number, number];
      sw: [number, number];
    };
    zoom: number;
  } | null;
}) {
  const {
    setMapFocused,
    setFeedFocused,
    setMapSubscriptionAnchor,
    setMapSubscriptionViewport,
  } = useSharedIncidents();

  useEffect(() => {
    setMapFocused(mapFocused);
    return () => {
      setMapFocused(false);
    };
  }, [mapFocused, setMapFocused]);

  useEffect(() => {
    setFeedFocused(feedFocused);
    return () => {
      setFeedFocused(false);
    };
  }, [feedFocused, setFeedFocused]);

  useEffect(() => {
    if (mapAnchor) {
      setMapSubscriptionAnchor(mapAnchor);
    }
  }, [mapAnchor, setMapSubscriptionAnchor]);

  useEffect(() => {
    if (mapViewport) {
      setMapSubscriptionViewport(mapViewport);
    }
  }, [mapViewport, setMapSubscriptionViewport]);

  return null;
}

/**
 * Test consumer for location context
 */
export function LocationConsumer({ testId }: { testId?: string }) {
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
export function CacheConsumer({
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
export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <IncidentCacheProvider>
        <IncidentSubscriptionProvider>
          <FocusSetter />
          {children}
        </IncidentSubscriptionProvider>
      </IncidentCacheProvider>
    </LocationProvider>
  );
}

export function TestWrapperWithoutFocus({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <IncidentCacheProvider>
        <IncidentSubscriptionProvider>{children}</IncidentSubscriptionProvider>
      </IncidentCacheProvider>
    </LocationProvider>
  );
}

// =============================================================================
export { render, waitFor, act };
export { InteractionManager, Text, View };
export { IncidentSubscriptionProvider, useSharedIncidents };
export { LocationProvider, useSharedLocation };
export { IncidentCacheProvider, useIncidentCache };
