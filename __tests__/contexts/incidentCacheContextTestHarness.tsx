/**
 * IncidentCacheContext Tests
 *
 * Tests the incident cache context provider functionality including:
 * - Provider renders children correctly
 * - Context values are accessible to consumers
 * - Cache hit/miss behavior
 * - Upsert operations
 * - Cache eviction when exceeding max size
 * - Version updates for re-renders
 * - Edge cases
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View, Button } from 'react-native';

import {
  IncidentCacheProvider,
  useIncidentCache,
} from '../../contexts/IncidentCacheContext';
import type { ProcessedIncident } from '../../hooks/useIncidentSubscription';
import { INCIDENT_LIMITS } from '../../lib/map/constants';
import { buildProcessedIncident } from '../fixtures/incident/buildIncident';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock ProcessedIncident for testing
 */
export function createMockIncident(
  id: string,
  createdAt: number = Date.now() / 1000,
  overrides: Partial<ProcessedIncident> = {}
): ProcessedIncident {
  const occurredAt = new Date(createdAt * 1000);
  return buildProcessedIncident(id, {
    eventId: `event_${id}`,
    pubkey: 'test_pubkey_123',
    title: `Test Incident ${id}`,
    description: `Description for incident ${id}`,
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
 * Test consumer component that displays cache state
 */
export function CacheConsumer({
  testId,
  onReady,
}: {
  testId?: string;
  onReady?: (api: ReturnType<typeof useIncidentCache>) => void;
}) {
  const cache = useIncidentCache();

  React.useEffect(() => {
    if (onReady) {
      onReady(cache);
    }
  }, [cache, onReady]);

  return (
    <View testID={testId}>
      <Text testID="version">{cache.version}</Text>
    </View>
  );
}

/**
 * Test consumer that fetches and displays an incident
 */
export function IncidentFetcher({
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
      <Text testID="incident-title">{incident?.title || 'Not Found'}</Text>
      <Text testID="incident-id">{incident?.incidentId || 'N/A'}</Text>
      <Text testID="version">{version}</Text>
    </View>
  );
}

/**
 * Test consumer that can upsert incidents
 */
export function CacheUpdater({
  incidents,
  onUpsert,
}: {
  incidents: ProcessedIncident[];
  onUpsert?: () => void;
}) {
  const { upsertMany, version } = useIncidentCache();

  const handleUpsert = () => {
    upsertMany(incidents);
    if (onUpsert) {
      onUpsert();
    }
  };

  return (
    <View>
      <Text testID="version">{version}</Text>
      <Button testID="upsert-button" title="Upsert" onPress={handleUpsert} />
    </View>
  );
}

// =============================================================================
export { render, act, waitFor };
export { Text, View, Button };
export { IncidentCacheProvider, useIncidentCache };
export { INCIDENT_LIMITS };
