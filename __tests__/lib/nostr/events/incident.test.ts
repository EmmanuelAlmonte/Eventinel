/**
 * Incident Event Parsing Tests
 *
 * Parser-focused tests for Nostr kind:30911 incident events.
 */

import { NDKEvent } from '@nostr-dev-kit/mobile';
import { parseIncidentEvent, parseGeolocation } from '../../../../lib/nostr/events/incident';

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

    it('does not include the raw event in the parsed result', () => {
      const event = createMockIncidentEvent();
      const result = parseIncidentEvent(event);

      expect(result).not.toHaveProperty('rawEvent');
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

    it('falls back to content coordinates when l tag is missing', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'l');

      const result = parseIncidentEvent(event);

      expect(result?.location.lat).toBe(39.9526);
      expect(result?.location.lng).toBe(-75.1652);
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

    it('falls back to content coordinates for malformed geolocation tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', 'invalid'] : t));

      const result = parseIncidentEvent(event);

      expect(result?.location.lat).toBe(39.9526);
      expect(result?.location.lng).toBe(-75.1652);
    });

    it('falls back to content coordinates for out-of-bounds geolocation tag', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', '91.0,-75.0'] : t));

      const result = parseIncidentEvent(event);

      expect(result?.location.lat).toBe(39.9526);
      expect(result?.location.lng).toBe(-75.1652);
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
      expect(result?.location.geohash.length).toBe(6); // Current default precision
    });
  });
});
