/**
 * useIncidentSubscription Hook Tests
 *
 * Tests the incident subscription hook including:
 * - Simple global NDK filter construction
 * - Event parsing and deduplication
 * - Severity counting
 * - Loading states
 * - Enabled/disabled behavior
 *
 * @jest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// Import mock helpers
import {
  mockSubscription,
  mockNDKHooks,
} from '../../../__mocks__/@nostr-dev-kit/mobile';
import { INCIDENT_LIMITS } from '../../../lib/map/constants';
import {
  INITIAL_HISTORY_RELAY_BUFFER_MS,
  SUBSCRIPTION_BUFFER_MS,
} from '../../../hooks/incidentSubscription/types';

// Mock ngeohash
jest.mock('ngeohash', () => {
  const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
  const makeNeighbor = (hash: string, offset: number) => {
    const prefix = hash.slice(0, -1);
    const last = hash[hash.length - 1] ?? '0';
    const index = Math.max(0, alphabet.indexOf(last));
    return `${prefix}${alphabet[(index + offset) % alphabet.length]}`;
  };

  return {
    encode: jest.fn((lat: number, lng: number, _precision: number) => {
      // Return a deterministic hash based on coordinates
      return `gh${Math.abs(lat).toFixed(0)}${Math.abs(lng).toFixed(0)}`;
    }),
    bboxes: jest.fn((
      minLat: number,
      minLng: number,
      _maxLat: number,
      _maxLng: number,
      _precision: number
    ) => [
      `gh${Math.abs(minLat).toFixed(0)}${Math.abs(minLng).toFixed(0)}`,
    ]),
    neighbors: jest.fn((hash: string) => ({
      n: makeNeighbor(hash, 1),
      ne: makeNeighbor(hash, 2),
      e: makeNeighbor(hash, 3),
      se: makeNeighbor(hash, 4),
      s: makeNeighbor(hash, 5),
      sw: makeNeighbor(hash, 6),
      w: makeNeighbor(hash, 7),
      nw: makeNeighbor(hash, 8),
    })),
  };
});

jest.mock('@lib/ndk', () => ({
  ndk: mockNDKHooks.getNDK(),
  deleteIncidentEventsFromNdkCache: jest.fn(),
}));

export const mockDeleteIncidentEventsFromNdkCache = jest.requireMock('@lib/ndk')
  .deleteIncidentEventsFromNdkCache as jest.Mock;

// Mock the incident parser
jest.mock('@lib/nostr/events/incident', () => ({
  parseIncidentEvent: jest.fn((event) => {
    // Simple mock parser that extracts data from event
    try {
      const content = JSON.parse(event.content);
      const dTag = event.tags?.find((t: string[]) => t[0] === 'd');
      const severityTag = event.tags?.find((t: string[]) => t[0] === 'severity');

      return {
        eventId: event.id,
        incidentId: dTag?.[1] || event.id,
        pubkey: event.pubkey,
        createdAt: event.created_at || Math.floor(Date.now() / 1000),
        type: content.type || 'other',
        severity: parseInt(severityTag?.[1] || '1', 10),
        title: content.title || 'Test Incident',
        description: content.description || '',
        location: {
          lat: content.lat ?? 0,
          lng: content.lng ?? 0,
          address: content.address || '',
          geohash: event.tags?.find((tag: string[]) => tag[0] === 'g')?.[1] ?? 'gh4075',
        },
        occurredAt: content.occurredAt ? new Date(content.occurredAt) : new Date(),
        source: content.source || 'community',
        sourceId: content.sourceId || 'test-123',
        isVerified: false,
      };
    } catch {
      return null;
    }
  }),
  getTagValue: jest.fn((tags: string[][], tagName: string) => {
    const tag = tags?.find((t) => t[0] === tagName);
    return tag?.[1];
  }),
  getTagValues: jest.fn((tags: string[][], tagName: string) => {
    return (tags ?? []).filter((t) => t[0] === tagName).map((t) => t[1]);
  }),
  parseGeolocation: jest.fn((geoTag: string | undefined) => {
    if (!geoTag) return null;

    const parts = geoTag.split(',');
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  }),
}));

// Import the hook after mocks
import { useIncidentSubscription } from '../../../hooks/useIncidentSubscription';
import type { UseIncidentSubscriptionOptions } from '../../../hooks/useIncidentSubscription';

// =============================================================================
// HELPERS
// =============================================================================

let mockEventSequence = 0;

function nextMockId(prefix: string): string {
  mockEventSequence += 1;
  return `${prefix}_${mockEventSequence}`;
}

export function createMockIncidentEvent(overrides: Partial<any> = {}) {
  const id = overrides.id ?? nextMockId('event');
  const incidentId = overrides.incidentId ?? nextMockId('incident');
  const severity = overrides.severity ?? 3;
  const createdAt = overrides.created_at ?? Math.floor(Date.now() / 1000);
  const occurredAt = overrides.occurredAt ?? new Date().toISOString();

  return {
    id,
    pubkey: overrides.pubkey ?? 'mock_pubkey',
    kind: 30911,
    created_at: createdAt,
    tags: [
      ['d', incidentId],
      ['severity', String(severity)],
      ['g', 'gh4075'],
      ['t', 'incident'],
      ...(overrides.tags ?? []),
    ],
    content: JSON.stringify({
      title: overrides.title ?? 'Test Incident',
      description: overrides.description ?? 'Test description',
      lat: overrides.lat ?? 39.9526,
      lng: overrides.lng ?? -75.1652,
      type: overrides.type ?? 'fire',
      severity,
      occurredAt,
      source: overrides.source ?? 'community',
      sourceId: overrides.sourceId ?? 'test-123',
    }),
  };
}

export function getSubscribeCalls() {
  return mockNDKHooks.getNDK().subscribe.mock.calls;
}

// =============================================================================
export { act, renderHook, waitFor };
export { mockSubscription, mockNDKHooks };
export { INCIDENT_LIMITS };
export { INITIAL_HISTORY_RELAY_BUFFER_MS, SUBSCRIPTION_BUFFER_MS };
export { useIncidentSubscription };

export function resetIncidentSubscriptionTestHarness() {
  mockSubscription.reset();
  jest.clearAllMocks();
  mockDeleteIncidentEventsFromNdkCache.mockReset();
  mockEventSequence = 0;
}
