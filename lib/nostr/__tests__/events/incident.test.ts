/**
 * Incident Event Parsing Tests
 *
 * Comprehensive test suite for Nostr kind:30911 incident event parsing,
 * validation, and creation. Tests the core data integrity layer for Eventinel.
 *
 * Coverage targets:
 * - parseIncidentEvent(): 15+ tests
 * - parseGeolocation(): 10 tests
 * - createIncidentEvent(): 5 tests
 * - validateIncidentEvent(): 12+ tests
 * - Type guards: 6 tests
 *
 * Total: 48 test cases
 */

import { NDKEvent } from '@nostr-dev-kit/mobile';
import {
  parseIncidentEvent,
  createIncidentEvent,
  validateIncidentEvent,
  parseGeolocation,
  getTagValue,
  getTagValues,
} from '../../events/incident';
import {
  isIncidentType,
  isSeverity,
  isDataSource,
  isIncidentEventContent,
} from '../../events/types';
import type { CreateIncidentInput } from '../../events/types';

// =============================================================================
// MOCK HELPERS
// =============================================================================

/**
 * Mock NDK instance for event creation
 */
class MockNDK {
  explicitRelayUrls: string[] = ['wss://localhost:8443'];
}

/**
 * Creates a mock NDKEvent for testing incident parsing
 */
function createMockIncidentEvent(
  overrides?: Partial<{
    incidentId: string;
    type: string;
    severity: number;
    lat: number;
    lng: number;
    title: string;
    description: string;
    address: string;
    city: string;
    state: string;
    source: string;
    sourceId: string;
    pubkey: string;
    kind: number;
    malformedContent: boolean;
  }>
): NDKEvent {
  const {
    incidentId = 'test-incident-123',
    type = 'fire',
    severity = 3,
    lat = 39.9526,
    lng = -75.1652,
    title = 'Test Incident',
    description = 'Test incident description',
    address = '123 Test Street',
    city = 'Sample City',
    state = 'ST',
    source = 'crimeometer',
    sourceId = 'cm-test-123',
    pubkey = 'test-pubkey-abc123',
    kind = 30911,
    malformedContent = false,
  } = overrides || {};

  const mockNdk = new MockNDK() as any;
  const event = new NDKEvent(mockNdk);

  event.kind = kind;
  event.pubkey = pubkey;
  event.created_at = Math.floor(Date.now() / 1000);
  event.id = `event-${Date.now()}`;
  event.sig = 'test-signature';

  event.tags = [
    ['d', incidentId],
    ['g', 'dr5ru'],
    ['l', `${lat},${lng}`],
    ['type', type],
    ['severity', severity.toString()],
    ['source', source],
    ['address', address],
    ['t', 'eventinel'],
    ['t', 'incident'],
    ['t', type],
  ];

  if (malformedContent) {
    event.content = 'not valid json{';
  } else {
    event.content = JSON.stringify({
      title,
      description,
      lat,
      lng,
      type,
      severity,
      occurredAt: new Date().toISOString(),
      source,
      sourceId,
      city,
      state,
    });
  }

  return event;
}

// =============================================================================
// TESTS: parseGeolocation()
// =============================================================================

describe('parseGeolocation', () => {
  it('parses valid lat,lng string', () => {
    const result = parseGeolocation('39.9526,-75.1652');
    expect(result).toEqual({ lat: 39.9526, lng: -75.1652 });
  });

  it('parses coordinates with extra precision', () => {
    const result = parseGeolocation('39.952635,-75.165222');
    expect(result).toEqual({ lat: 39.952635, lng: -75.165222 });
  });

  it('returns null for undefined input', () => {
    expect(parseGeolocation(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseGeolocation('')).toBeNull();
  });

  it('returns null for malformed string (no comma)', () => {
    expect(parseGeolocation('39.9526')).toBeNull();
  });

  it('returns null for malformed string (too many parts)', () => {
    expect(parseGeolocation('39.9526,-75.1652,extra')).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    expect(parseGeolocation('abc,def')).toBeNull();
  });

  it('returns null for lat out of bounds (> 90)', () => {
    expect(parseGeolocation('91.0,-75.0')).toBeNull();
  });

  it('returns null for lat out of bounds (< -90)', () => {
    expect(parseGeolocation('-91.0,-75.0')).toBeNull();
  });

  it('returns null for lng out of bounds (> 180)', () => {
    expect(parseGeolocation('39.0,181.0')).toBeNull();
  });

  it('returns null for lng out of bounds (< -180)', () => {
    expect(parseGeolocation('39.0,-181.0')).toBeNull();
  });

  it('handles edge case coordinates (0,0)', () => {
    const result = parseGeolocation('0,0');
    expect(result).toEqual({ lat: 0, lng: 0 });
  });

  it('handles maximum valid coordinates', () => {
    const result = parseGeolocation('90,180');
    expect(result).toEqual({ lat: 90, lng: 180 });
  });

  it('handles minimum valid coordinates', () => {
    const result = parseGeolocation('-90,-180');
    expect(result).toEqual({ lat: -90, lng: -180 });
  });

  it('handles negative coordinates', () => {
    const result = parseGeolocation('-33.8688,151.2093'); // Sydney
    expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
  });
});

// =============================================================================
// TESTS: parseIncidentEvent()
// =============================================================================

describe('parseIncidentEvent', () => {
  describe('valid event parsing', () => {
    it('parses valid incident event correctly', () => {
      const event = createMockIncidentEvent({
        incidentId: 'test-123',
        type: 'fire',
        severity: 4,
        title: 'Structure Fire',
        lat: 39.9526,
        lng: -75.1652,
      });

      const result = parseIncidentEvent(event);

      expect(result).not.toBeNull();
      expect(result?.incidentId).toBe('test-123');
      expect(result?.type).toBe('fire');
      expect(result?.severity).toBe(4);
      expect(result?.title).toBe('Structure Fire');
      expect(result?.location.lat).toBe(39.9526);
      expect(result?.location.lng).toBe(-75.1652);
      expect(result?.isVerified).toBe(false);
    });

    it('includes all required fields in parsed incident', () => {
      const event = createMockIncidentEvent();
      const result = parseIncidentEvent(event);

      expect(result).toMatchObject({
        eventId: expect.any(String),
        incidentId: expect.any(String),
        pubkey: expect.any(String),
        createdAt: expect.any(Number),
        type: expect.any(String),
        severity: expect.any(Number),
        title: expect.any(String),
        description: expect.any(String),
        location: expect.objectContaining({
          lat: expect.any(Number),
          lng: expect.any(Number),
          address: expect.any(String),
          geohash: expect.any(String),
        }),
        occurredAt: expect.any(Date),
        source: expect.any(String),
        sourceId: expect.any(String),
        isVerified: expect.any(Boolean),
      });
    });

    it('includes raw event when parsed successfully', () => {
      const event = createMockIncidentEvent();
      const result = parseIncidentEvent(event);

      expect(result?.rawEvent).toBe(event);
    });
  });

  describe('incident type parsing', () => {
    const types = [
      'fire',
      'medical',
      'traffic',
      'transit',
      'weather',
      'public_health',
      'violent_crime',
      'property_crime',
      'disturbance',
      'suspicious',
      'other',
    ];

    types.forEach((type) => {
      it(`parses ${type} incident type correctly`, () => {
        const event = createMockIncidentEvent({ type });
        const result = parseIncidentEvent(event);
        expect(result?.type).toBe(type);
      });
    });
  });

  describe('nj compatibility parsing', () => {
    it('parses transit incident from nj_transit_rss source', () => {
      const event = createMockIncidentEvent({
        type: 'transit',
        source: 'nj_transit_rss',
      });
      const result = parseIncidentEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('transit');
      expect(result?.source).toBe('nj_transit_rss');
    });

    it('parses weather incident from nj_511_rss source', () => {
      const event = createMockIncidentEvent({
        type: 'weather',
        source: 'nj_511_rss',
      });
      const result = parseIncidentEvent(event);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('weather');
      expect(result?.source).toBe('nj_511_rss');
    });
  });

  describe('severity level parsing', () => {
    [1, 2, 3, 4, 5].forEach((severity) => {
      it(`parses severity ${severity} correctly`, () => {
        const event = createMockIncidentEvent({ severity });
        const result = parseIncidentEvent(event);
        expect(result?.severity).toBe(severity);
      });
    });
  });

  describe('event kind validation', () => {
    it('returns null for wrong event kind', () => {
      const event = createMockIncidentEvent({ kind: 1 }); // Wrong kind
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for kind 0 (metadata)', () => {
      const event = createMockIncidentEvent({ kind: 0 });
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for kind 30000 (different parameterized)', () => {
      const event = createMockIncidentEvent({ kind: 30000 });
      expect(parseIncidentEvent(event)).toBeNull();
    });
  });

  describe('required tag validation', () => {
    it('returns null for missing d tag (incident ID)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'd');
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for missing l tag (geolocation)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'l');
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for missing type tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'type');
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for missing severity tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'severity');
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for missing source tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'source');
      expect(parseIncidentEvent(event)).toBeNull();
    });
  });

  describe('invalid data validation', () => {
    it('returns null for invalid severity (0)', () => {
      const event = createMockIncidentEvent({ severity: 4 });
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', '0'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for invalid severity (6)', () => {
      const event = createMockIncidentEvent({ severity: 4 });
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', '6'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for invalid severity (negative)', () => {
      const event = createMockIncidentEvent({ severity: 4 });
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', '-1'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for invalid incident type', () => {
      const event = createMockIncidentEvent({ type: 'fire' });
      event.tags = event.tags.map((t) => (t[0] === 'type' ? ['type', 'invalid_type'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for invalid data source', () => {
      const event = createMockIncidentEvent({ source: 'crimeometer' });
      event.tags = event.tags.map((t) => (t[0] === 'source' ? ['source', 'invalid_source'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for malformed geolocation tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', 'invalid'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for out-of-bounds coordinates', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', '91.0,-75.0'] : t));
      expect(parseIncidentEvent(event)).toBeNull();
    });
  });

  describe('content JSON validation', () => {
    it('returns null for malformed content JSON', () => {
      const event = createMockIncidentEvent({ malformedContent: true });
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for empty content', () => {
      const event = createMockIncidentEvent();
      event.content = '';
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('returns null for content missing required fields', () => {
      const event = createMockIncidentEvent();
      event.content = JSON.stringify({ title: 'Test' }); // Missing required fields
      expect(parseIncidentEvent(event)).toBeNull();
    });

    it('handles optional metadata field', () => {
      const event = createMockIncidentEvent();
      const content = JSON.parse(event.content);
      content.metadata = { custom: 'data', units: '2' };
      event.content = JSON.stringify(content);

      const result = parseIncidentEvent(event);
      expect(result?.metadata).toEqual({ custom: 'data', units: '2' });
    });
  });

  describe('verification status', () => {
    beforeEach(() => {
      // Clear environment variable before each test
      delete process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
    });

    it('sets isVerified=true for official pubkey', () => {
      const officialPubkey = 'official-pubkey-abc123';
      process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX = officialPubkey;

      const event = createMockIncidentEvent({ pubkey: officialPubkey });
      const result = parseIncidentEvent(event);

      expect(result?.isVerified).toBe(true);
    });

    it('sets isVerified=false for non-official pubkey', () => {
      process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX = 'official123';

      const event = createMockIncidentEvent({ pubkey: 'random456' });
      const result = parseIncidentEvent(event);

      expect(result?.isVerified).toBe(false);
    });

    it('sets isVerified=false when no official pubkey configured', () => {
      const event = createMockIncidentEvent();
      const result = parseIncidentEvent(event);

      expect(result?.isVerified).toBe(false);
    });

    it('uses verified pubkeys set when provided', () => {
      const verifiedSet = new Set(['trusted1', 'trusted2']);
      const event = createMockIncidentEvent({ pubkey: 'trusted1' });

      const result = parseIncidentEvent(event, verifiedSet);
      expect(result?.isVerified).toBe(true);
    });

    it('returns false for pubkey not in verified set', () => {
      const verifiedSet = new Set(['trusted1', 'trusted2']);
      const event = createMockIncidentEvent({ pubkey: 'untrusted' });

      const result = parseIncidentEvent(event, verifiedSet);
      expect(result?.isVerified).toBe(false);
    });

    it('prefers verified set over env variable', () => {
      process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX = 'official';
      const verifiedSet = new Set(['trusted']);
      const event = createMockIncidentEvent({ pubkey: 'trusted' });

      const result = parseIncidentEvent(event, verifiedSet);
      expect(result?.isVerified).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('handles missing city and state', () => {
      const event = createMockIncidentEvent();
      const content = JSON.parse(event.content);
      delete content.city;
      delete content.state;
      event.content = JSON.stringify(content);

      const result = parseIncidentEvent(event);
      expect(result?.location.city).toBeUndefined();
      expect(result?.location.state).toBeUndefined();
    });

    it('falls back to title for address when address tag missing', () => {
      const event = createMockIncidentEvent({ title: 'Fire at Main St' });
      event.tags = event.tags.filter((t) => t[0] !== 'address');

      const result = parseIncidentEvent(event);
      expect(result?.location.address).toBe('Fire at Main St');
    });

    it('generates geohash when g tag is missing', () => {
      const event = createMockIncidentEvent({ lat: 39.9526, lng: -75.1652 });
      event.tags = event.tags.filter((t) => t[0] !== 'g');

      const result = parseIncidentEvent(event);
      expect(result?.location.geohash).toBeDefined();
      expect(result?.location.geohash.length).toBe(5); // Default precision
    });
  });
});

// =============================================================================
// TESTS: createIncidentEvent()
// =============================================================================

describe('createIncidentEvent', () => {
  let mockNDK: any;

  beforeEach(() => {
    mockNDK = new MockNDK();
  });

  it('creates event with correct kind 30911', () => {
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 4,
      title: 'Test Fire',
      description: 'Test description',
      location: {
        lat: 39.95,
        lng: -75.16,
        address: '123 Main St',
        city: 'Sample City',
        state: 'ST',
      },
      occurredAt: new Date('2026-01-06T12:00:00Z'),
      source: 'crimeometer',
      sourceId: 'cm-123',
    };

    const event = createIncidentEvent(mockNDK, input);

    expect(event.kind).toBe(30911);
  });

  it('includes all required tags', () => {
    const input: CreateIncidentInput = {
      type: 'medical',
      severity: 3,
      title: 'Medical Emergency',
      description: 'Person injured',
      location: { lat: 39.95, lng: -75.16, address: '456 Oak Ave' },
      occurredAt: new Date(),
      source: 'crimeometer',
      sourceId: 'cm-456',
    };

    const event = createIncidentEvent(mockNDK, input);

    const tags = event.tags;
    expect(tags.find((t) => t[0] === 'd')).toBeDefined(); // incident ID
    expect(tags.find((t) => t[0] === 'l')).toBeDefined(); // lat,lng
    expect(tags.find((t) => t[0] === 'g')).toBeDefined(); // geohash
    expect(tags.find((t) => t[0] === 'type')).toBeDefined();
    expect(tags.find((t) => t[0] === 'severity')).toBeDefined();
    expect(tags.find((t) => t[0] === 'source')).toBeDefined();
    expect(tags.find((t) => t[0] === 'address')).toBeDefined();
  });

  it('includes eventinel and incident hashtags', () => {
    const input: CreateIncidentInput = {
      type: 'traffic',
      severity: 2,
      title: 'Traffic Accident',
      description: 'Minor collision',
      location: { lat: 39.95, lng: -75.16, address: '789 Pine St' },
      occurredAt: new Date(),
      source: 'crimeometer',
      sourceId: 'cm-789',
    };

    const event = createIncidentEvent(mockNDK, input);

    const hashtags = event.tags.filter((t) => t[0] === 't').map((t) => t[1]);
    expect(hashtags).toContain('eventinel');
    expect(hashtags).toContain('incident');
    expect(hashtags).toContain('traffic'); // Type-specific tag
  });

  it('generates UUID for incidentId if not provided', () => {
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 4,
      title: 'Test',
      description: 'Test',
      location: { lat: 39.95, lng: -75.16, address: 'Test' },
      occurredAt: new Date(),
      source: 'crimeometer',
      sourceId: 'test',
    };

    const event = createIncidentEvent(mockNDK, input);

    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    expect(dTag).toBeDefined();
    expect(dTag).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  });

  it('uses provided incidentId if given', () => {
    const input: CreateIncidentInput = {
      incidentId: 'custom-id-123',
      type: 'fire',
      severity: 4,
      title: 'Test',
      description: 'Test',
      location: { lat: 39.95, lng: -75.16, address: 'Test' },
      occurredAt: new Date(),
      source: 'crimeometer',
      sourceId: 'test',
    };

    const event = createIncidentEvent(mockNDK, input);

    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    expect(dTag).toBe('custom-id-123');
  });

  it('creates valid JSON content', () => {
    const occurredAt = new Date('2026-01-06T15:30:00Z');
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 5,
      title: 'Structure Fire',
      description: 'Large fire reported',
      location: {
        lat: 39.9526,
        lng: -75.1652,
        address: '1234 Main St',
        city: 'Sample City',
        state: 'ST',
      },
      occurredAt,
      source: 'crimeometer',
      sourceId: 'cm-999',
      metadata: { units: '3', alarm: '2' },
    };

    const event = createIncidentEvent(mockNDK, input);
    const content = JSON.parse(event.content);

    expect(content).toMatchObject({
      title: 'Structure Fire',
      description: 'Large fire reported',
      lat: 39.9526,
      lng: -75.1652,
      type: 'fire',
      severity: 5,
      occurredAt: occurredAt.toISOString(),
      source: 'crimeometer',
      sourceId: 'cm-999',
      city: 'Sample City',
      state: 'ST',
      metadata: { units: '3', alarm: '2' },
    });
  });

  it('generates correct geohash with default precision', () => {
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 4,
      title: 'Test',
      description: 'Test',
      location: { lat: 39.9526, lng: -75.1652, address: 'Test' },
      occurredAt: new Date(),
      source: 'crimeometer',
      sourceId: 'test',
    };

    const event = createIncidentEvent(mockNDK, input);
    const geohashTag = event.tags.find((t) => t[0] === 'g')?.[1];

    expect(geohashTag).toBeDefined();
    expect(geohashTag?.length).toBe(5); // Default precision
  });
});

// =============================================================================
// TESTS: validateIncidentEvent()
// =============================================================================

describe('validateIncidentEvent', () => {
  beforeEach(() => {
    delete process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX;
  });

  it('returns valid for properly formed event', () => {
    const event = createMockIncidentEvent();
    const result = validateIncidentEvent(event);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for wrong event kind', () => {
    const event = createMockIncidentEvent({ kind: 1 });
    const result = validateIncidentEvent(event);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid kind: expected 30911, got 1');
  });

  describe('missing required tags', () => {
    it('returns error for missing d tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'd');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required tag: d');
    });

    it('returns error for missing l tag (geolocation)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'l');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required tag: l');
    });

    it('returns error for missing type tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'type');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required tag: type');
    });

    it('returns error for missing severity tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'severity');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required tag: severity');
    });

    it('returns error for missing source tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'source');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required tag: source');
    });
  });

  describe('invalid field values', () => {
    it('returns error for invalid geolocation format', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', 'invalid'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid geolocation format: invalid');
    });

    it('returns error for out-of-bounds coordinates', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', '95.0,-75.0'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid geolocation format');
    });

    it('returns warning for unknown incident type', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'type' ? ['type', 'unknown_type'] : t));

      const result = validateIncidentEvent(event);

      expect(result.warnings).toContain('Unknown incident type: unknown_type');
    });

    it('returns error for invalid severity (0)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', '0'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid severity: 0 (must be 1-5)');
    });

    it('returns error for invalid severity (6)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', '6'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid severity: 6 (must be 1-5)');
    });

    it('returns error for invalid severity (non-numeric)', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'severity' ? ['severity', 'high'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid severity: high (must be 1-5)');
    });
  });

  describe('content validation', () => {
    it('returns error for malformed content JSON', () => {
      const event = createMockIncidentEvent({ malformedContent: true });
      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content is not valid JSON');
    });

    it('returns error for content missing required fields', () => {
      const event = createMockIncidentEvent();
      event.content = JSON.stringify({ title: 'Test' });

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content JSON missing required fields');
    });

    it('validates successfully with all required content fields', () => {
      const event = createMockIncidentEvent();
      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(true);
    });
  });

  describe('optional field warnings', () => {
    it('returns warning for missing geohash tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'g');

      const result = validateIncidentEvent(event);

      expect(result.warnings).toContain('Missing geohash tag (recommended for filtering)');
    });

    it('returns warning for missing address tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'address');

      const result = validateIncidentEvent(event);

      expect(result.warnings).toContain('Missing address tag');
    });

    it('returns warning for missing eventinel hashtag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => !(t[0] === 't' && t[1] === 'eventinel'));

      const result = validateIncidentEvent(event);

      expect(result.warnings).toContain('Missing eventinel hashtag');
    });
  });

  describe('verification status in validation', () => {
    it('sets isVerified true for official pubkey', () => {
      const officialPubkey = 'official-key-xyz';
      process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX = officialPubkey;

      const event = createMockIncidentEvent({ pubkey: officialPubkey });
      const result = validateIncidentEvent(event);

      expect(result.isVerified).toBe(true);
    });

    it('sets isVerified false for non-official pubkey', () => {
      process.env.EVENTINEL_OFFICIAL_PUBKEY_HEX = 'official';

      const event = createMockIncidentEvent({ pubkey: 'other' });
      const result = validateIncidentEvent(event);

      expect(result.isVerified).toBe(false);
    });

    it('sets isVerified false when no official pubkey configured', () => {
      const event = createMockIncidentEvent();
      const result = validateIncidentEvent(event);

      expect(result.isVerified).toBe(false);
    });
  });

  describe('multiple errors and warnings', () => {
    it('collects multiple errors', () => {
      const event = createMockIncidentEvent();
      event.kind = 1; // Wrong kind
      event.tags = event.tags.filter((t) => t[0] !== 'd'); // Missing d tag
      event.content = 'invalid json'; // Invalid content

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('collects multiple warnings while still valid', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'g'); // Missing geohash
      event.tags = event.tags.filter((t) => !(t[0] === 't' && t[1] === 'eventinel')); // Missing hashtag

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// =============================================================================
// TESTS: Type Guards
// =============================================================================

describe('Type Guards', () => {
  describe('isIncidentType', () => {
    it('returns true for valid incident types', () => {
      expect(isIncidentType('fire')).toBe(true);
      expect(isIncidentType('medical')).toBe(true);
      expect(isIncidentType('traffic')).toBe(true);
      expect(isIncidentType('transit')).toBe(true);
      expect(isIncidentType('weather')).toBe(true);
      expect(isIncidentType('public_health')).toBe(true);
      expect(isIncidentType('violent_crime')).toBe(true);
      expect(isIncidentType('property_crime')).toBe(true);
      expect(isIncidentType('disturbance')).toBe(true);
      expect(isIncidentType('suspicious')).toBe(true);
      expect(isIncidentType('other')).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isIncidentType('invalid')).toBe(false);
      expect(isIncidentType('FIRE')).toBe(false); // Case sensitive
      expect(isIncidentType('')).toBe(false);
      expect(isIncidentType('crime')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isIncidentType(123)).toBe(false);
      expect(isIncidentType(null)).toBe(false);
      expect(isIncidentType(undefined)).toBe(false);
      expect(isIncidentType({})).toBe(false);
      expect(isIncidentType(['fire'])).toBe(false);
    });
  });

  describe('isSeverity', () => {
    it('returns true for valid severity levels', () => {
      expect(isSeverity(1)).toBe(true);
      expect(isSeverity(2)).toBe(true);
      expect(isSeverity(3)).toBe(true);
      expect(isSeverity(4)).toBe(true);
      expect(isSeverity(5)).toBe(true);
    });

    it('returns false for invalid severity levels', () => {
      expect(isSeverity(0)).toBe(false);
      expect(isSeverity(6)).toBe(false);
      expect(isSeverity(-1)).toBe(false);
      expect(isSeverity(10)).toBe(false);
    });

    it('returns false for non-numeric types', () => {
      expect(isSeverity('3')).toBe(false);
      expect(isSeverity(null)).toBe(false);
      expect(isSeverity(undefined)).toBe(false);
      expect(isSeverity(3.5)).toBe(false); // Not an integer 1-5
    });
  });

  describe('isDataSource', () => {
    it('returns true for valid data sources', () => {
      expect(isDataSource('crimeometer')).toBe(true);
      expect(isDataSource('opendataphilly')).toBe(true);
      expect(isDataSource('radio')).toBe(true);
      expect(isDataSource('community')).toBe(true);
      expect(isDataSource('nj_transit_rss')).toBe(true);
      expect(isDataSource('nj_511_rss')).toBe(true);
    });

    it('returns false for invalid data sources', () => {
      expect(isDataSource('invalid')).toBe(false);
      expect(isDataSource('CRIMEOMETER')).toBe(false); // Case sensitive
      expect(isDataSource('')).toBe(false);
      expect(isDataSource('twitter')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isDataSource(123)).toBe(false);
      expect(isDataSource(null)).toBe(false);
      expect(isDataSource(undefined)).toBe(false);
      expect(isDataSource({})).toBe(false);
    });
  });

  describe('isIncidentEventContent', () => {
    it('returns true for valid incident content', () => {
      const validContent = {
        title: 'Test Incident',
        description: 'Test description',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test-123',
      };

      expect(isIncidentEventContent(validContent)).toBe(true);
    });

    it('returns true for valid content with optional fields', () => {
      const validContent = {
        title: 'Test',
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'medical',
        severity: 4,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test-123',
        city: 'Sample City',
        state: 'ST',
        metadata: { custom: 'data' },
      };

      expect(isIncidentEventContent(validContent)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      const missingTitle = {
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(missingTitle)).toBe(false);
    });

    it('returns false for invalid field types', () => {
      const invalidTypes = {
        title: 123, // Should be string
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(invalidTypes)).toBe(false);
    });

    it('returns false for invalid nested type values', () => {
      const invalidType = {
        title: 'Test',
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'invalid_type',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(invalidType)).toBe(false);
    });

    it('returns false for non-object inputs', () => {
      expect(isIncidentEventContent(null)).toBe(false);
      expect(isIncidentEventContent(undefined)).toBe(false);
      expect(isIncidentEventContent('string')).toBe(false);
      expect(isIncidentEventContent(123)).toBe(false);
      expect(isIncidentEventContent([])).toBe(false);
    });
  });
});

// =============================================================================
// TESTS: Tag Helper Functions
// =============================================================================

describe('Tag Helpers', () => {
  describe('getTagValue', () => {
    it('extracts single tag value', () => {
      const tags = [
        ['d', 'incident-123'],
        ['type', 'fire'],
        ['severity', '4'],
      ];

      expect(getTagValue(tags, 'd')).toBe('incident-123');
      expect(getTagValue(tags, 'type')).toBe('fire');
      expect(getTagValue(tags, 'severity')).toBe('4');
    });

    it('returns undefined for non-existent tag', () => {
      const tags = [['type', 'fire']];
      expect(getTagValue(tags, 'missing')).toBeUndefined();
    });

    it('returns first value when multiple tags exist', () => {
      const tags = [
        ['t', 'eventinel'],
        ['t', 'incident'],
        ['t', 'fire'],
      ];

      expect(getTagValue(tags, 't')).toBe('eventinel');
    });

    it('handles empty tags array', () => {
      expect(getTagValue([], 'any')).toBeUndefined();
    });
  });

  describe('getTagValues', () => {
    it('extracts all values for a tag type', () => {
      const tags = [
        ['t', 'eventinel'],
        ['t', 'incident'],
        ['t', 'fire'],
        ['type', 'fire'],
      ];

      const hashtags = getTagValues(tags, 't');
      expect(hashtags).toEqual(['eventinel', 'incident', 'fire']);
    });

    it('returns empty array for non-existent tag', () => {
      const tags = [['type', 'fire']];
      expect(getTagValues(tags, 'missing')).toEqual([]);
    });

    it('handles empty tags array', () => {
      expect(getTagValues([], 'any')).toEqual([]);
    });

    it('returns single value in array', () => {
      const tags = [['d', 'incident-123']];
      expect(getTagValues(tags, 'd')).toEqual(['incident-123']);
    });
  });
});
