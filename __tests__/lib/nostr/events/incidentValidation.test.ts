/**
 * Incident Event Validation Tests
 */

import { NDKEvent } from '@nostr-dev-kit/mobile';
import { validateIncidentEvent } from '../../../../lib/nostr/events/incident';

class MockNDK {
  explicitRelayUrls: string[] = ['wss://localhost:8443'];
}

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

    it('remains valid when l tag is missing and content coordinates are valid', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.filter((t) => t[0] !== 'l');

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Missing required tag: l');
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
    it('remains valid for invalid geolocation tag when content coordinates are valid', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', 'invalid'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Invalid geolocation format: invalid');
    });

    it('remains valid for out-of-bounds geolocation tag when content coordinates are valid', () => {
      const event = createMockIncidentEvent();
      event.tags = event.tags.map((t) => (t[0] === 'l' ? ['l', '95.0,-75.0'] : t));

      const result = validateIncidentEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
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
