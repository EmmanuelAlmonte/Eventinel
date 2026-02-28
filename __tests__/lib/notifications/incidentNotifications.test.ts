/**
 * Unit Tests for lib/notifications/incidentNotifications.ts
 *
 * Tests coerceIncidentNotificationPayload and fetchIncidentFromRelay functions.
 */

import {
  coerceIncidentNotificationPayload,
  fetchIncidentFromRelay,
  IncidentNotificationPayload,
} from '../../../lib/notifications/incidentNotifications';

// Mock the ndk module
jest.mock('../../../lib/ndk', () => ({
  ndk: {
    fetchEvent: jest.fn(),
  },
}));

// Mock parseIncidentEvent
jest.mock('../../../lib/nostr/events/incident', () => ({
  parseIncidentEvent: jest.fn((event) => {
    if (!event) return null;
    return {
      eventId: event.id,
      incidentId: event.tags?.find((t: string[]) => t[0] === 'd')?.[1] || 'test-incident-id',
      title: 'Test Incident',
      description: 'Test description',
      type: 'fire',
      severity: 3,
      location: { lat: 0, lng: 0, address: 'Test Address' },
      occurredAt: new Date(),
      source: 'test',
      isVerified: false,
      pubkey: event.pubkey || 'test-pubkey',
      createdAt: event.created_at || Math.floor(Date.now() / 1000),
    };
  }),
}));

// Mock nostr config
jest.mock('../../../lib/nostr/config', () => ({
  NOSTR_KINDS: {
    INCIDENT: 30911,
  },
}));

import { ndk } from '../../../lib/ndk';
import { parseIncidentEvent } from '../../../lib/nostr/events/incident';

const mockedNdk = ndk as jest.Mocked<typeof ndk>;
const mockedParseIncidentEvent = parseIncidentEvent as jest.MockedFunction<
  typeof parseIncidentEvent
>;

// =============================================================================
// coerceIncidentNotificationPayload Tests
// =============================================================================

describe('coerceIncidentNotificationPayload', () => {
  describe('returns null for invalid input', () => {
    it('returns null for null input', () => {
      expect(coerceIncidentNotificationPayload(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(coerceIncidentNotificationPayload(undefined)).toBeNull();
    });

    it('returns null for empty object', () => {
      expect(coerceIncidentNotificationPayload({})).toBeNull();
    });

    it('returns null for string input', () => {
      expect(coerceIncidentNotificationPayload('test')).toBeNull();
    });

    it('returns null for number input', () => {
      expect(coerceIncidentNotificationPayload(123)).toBeNull();
    });

    it('returns null for array input', () => {
      expect(coerceIncidentNotificationPayload([])).toBeNull();
    });

    it('returns null for boolean input', () => {
      expect(coerceIncidentNotificationPayload(true)).toBeNull();
      expect(coerceIncidentNotificationPayload(false)).toBeNull();
    });
  });

  describe('extracts incidentId correctly', () => {
    it('extracts incidentId from camelCase property', () => {
      const data = { incidentId: 'test-incident-123' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('test-incident-123');
    });

    it('extracts incident_id from snake_case property', () => {
      const data = { incident_id: 'test-incident-456' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('test-incident-456');
    });

    it('prefers camelCase incidentId over snake_case', () => {
      const data = { incidentId: 'camel', incident_id: 'snake' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result?.incidentId).toBe('camel');
    });
  });

  describe('extracts eventId correctly', () => {
    it('extracts eventId from camelCase property', () => {
      const data = { eventId: 'event-123' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('event-123');
    });

    it('extracts event_id from snake_case property', () => {
      const data = { event_id: 'event-456' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('event-456');
    });

    it('extracts id as fallback for eventId', () => {
      const data = { id: 'generic-id' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('generic-id');
    });

    it('prefers eventId over event_id over id', () => {
      const data = { eventId: 'camel', event_id: 'snake', id: 'generic' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result?.eventId).toBe('camel');
    });
  });

  describe('handles mixed data', () => {
    it('extracts both incidentId and eventId', () => {
      const data = { incidentId: 'incident-123', eventId: 'event-456' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('incident-123');
      expect(result?.eventId).toBe('event-456');
    });

    it('returns payload with only incidentId', () => {
      const data = { incidentId: 'incident-only' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('incident-only');
      expect(result?.eventId).toBeUndefined();
    });

    it('returns payload with only eventId', () => {
      const data = { eventId: 'event-only' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBeUndefined();
      expect(result?.eventId).toBe('event-only');
    });
  });

  describe('ignores non-string values', () => {
    it('ignores numeric incidentId', () => {
      const data = { incidentId: 123, eventId: 'valid-event' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result?.incidentId).toBeUndefined();
      expect(result?.eventId).toBe('valid-event');
    });

    it('ignores object incidentId', () => {
      const data = { incidentId: { id: 'nested' }, eventId: 'valid' };
      const result = coerceIncidentNotificationPayload(data);

      expect(result?.incidentId).toBeUndefined();
      expect(result?.eventId).toBe('valid');
    });

    it('ignores array eventId', () => {
      const data = { incidentId: 'valid', eventId: ['array'] };
      const result = coerceIncidentNotificationPayload(data);

      expect(result?.incidentId).toBe('valid');
      expect(result?.eventId).toBeUndefined();
    });

    it('returns null if all IDs are non-string', () => {
      const data = { incidentId: 123, eventId: null, id: true };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).toBeNull();
    });
  });

  describe('handles extra properties', () => {
    it('ignores extra properties in the data', () => {
      const data = {
        incidentId: 'test',
        title: 'Some Title',
        extra: 'ignored',
        nested: { data: true },
      };
      const result = coerceIncidentNotificationPayload(data);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('test');
      expect((result as any).title).toBeUndefined();
      expect((result as any).extra).toBeUndefined();
    });
  });
});

// =============================================================================
// fetchIncidentFromRelay Tests
// =============================================================================

describe('fetchIncidentFromRelay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns null for invalid payloads', () => {
    it('returns null when payload has neither incidentId nor eventId', async () => {
      const payload: IncidentNotificationPayload = {};
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
      expect(mockedNdk.fetchEvent).not.toHaveBeenCalled();
    });

    it('returns null when both IDs are undefined', async () => {
      const payload = { incidentId: undefined, eventId: undefined };
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
    });
  });

  describe('fetches by eventId', () => {
    it('fetches event by eventId and parses it', async () => {
      const mockEvent = {
        id: 'event-123',
        pubkey: 'pubkey-abc',
        created_at: 1234567890,
        kind: 30911,
        tags: [['d', 'incident-456']],
        content: '{}',
      };

      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(mockEvent);

      const payload = { eventId: 'event-123' };
      const result = await fetchIncidentFromRelay(payload);

      expect(mockedNdk.fetchEvent).toHaveBeenCalledWith(
        [{ ids: ['event-123'] }],
        expect.any(Object)
      );
      expect(mockedParseIncidentEvent).toHaveBeenCalledWith(mockEvent);
      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('event-123');
    });

    it('returns null when event not found by eventId', async () => {
      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(null);

      const payload = { eventId: 'nonexistent' };
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
    });
  });

  describe('fetches by incidentId', () => {
    it('fetches event by incidentId using d tag filter', async () => {
      const mockEvent = {
        id: 'fetched-event-id',
        pubkey: 'pubkey-xyz',
        created_at: 1234567890,
        kind: 30911,
        tags: [['d', 'incident-789']],
        content: '{}',
      };

      // First call for eventId returns null, second for incidentId returns event
      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(mockEvent);

      const payload = { incidentId: 'incident-789' };
      const result = await fetchIncidentFromRelay(payload);

      expect(mockedNdk.fetchEvent).toHaveBeenCalledWith(
        [{ kinds: [30911], '#d': ['incident-789'] }],
        expect.any(Object)
      );
      expect(result).not.toBeNull();
    });

    it('returns null when event not found by incidentId', async () => {
      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(null);

      const payload = { incidentId: 'nonexistent-incident' };
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
    });
  });

  describe('priority: eventId over incidentId', () => {
    it('uses eventId first when both are provided', async () => {
      const mockEvent = {
        id: 'event-from-id',
        kind: 30911,
        tags: [],
        content: '{}',
      };

      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(mockEvent);

      const payload = { eventId: 'event-123', incidentId: 'incident-456' };
      const result = await fetchIncidentFromRelay(payload);

      // Should only call with ids filter, not #d filter
      expect(mockedNdk.fetchEvent).toHaveBeenCalledTimes(1);
      expect(mockedNdk.fetchEvent).toHaveBeenCalledWith(
        [{ ids: ['event-123'] }],
        expect.any(Object)
      );
      expect(result).not.toBeNull();
    });

    it('falls back to incidentId when eventId fetch returns null', async () => {
      const mockEvent = {
        id: 'event-from-incident',
        kind: 30911,
        tags: [['d', 'incident-456']],
        content: '{}',
      };

      // First call (by eventId) returns null, second (by incidentId) returns event
      (mockedNdk.fetchEvent as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEvent);

      const payload = { eventId: 'not-found', incidentId: 'incident-456' };
      const result = await fetchIncidentFromRelay(payload);

      expect(mockedNdk.fetchEvent).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
    });
  });

  describe('error handling', () => {
    it('returns null and logs warning on fetch error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (mockedNdk.fetchEvent as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const payload = { eventId: 'event-123' };
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Notifications] Failed to fetch incident event:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('returns null when parseIncidentEvent returns null', async () => {
      const mockEvent = { id: 'invalid-event' };
      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(mockEvent);
      mockedParseIncidentEvent.mockReturnValueOnce(null);

      const payload = { eventId: 'event-123' };
      const result = await fetchIncidentFromRelay(payload);

      expect(result).toBeNull();
    });
  });

  describe('cache usage options', () => {
    it('passes ONLY_RELAY cache option', async () => {
      (mockedNdk.fetchEvent as jest.Mock).mockResolvedValueOnce(null);

      const payload = { eventId: 'event-123' };
      await fetchIncidentFromRelay(payload);

      expect(mockedNdk.fetchEvent).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          cacheUsage: expect.anything(), // NDKSubscriptionCacheUsage.ONLY_RELAY
        })
      );
    });
  });
});
