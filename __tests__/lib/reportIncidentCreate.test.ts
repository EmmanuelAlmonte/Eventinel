import { createIncidentEvent } from '../../lib/nostr/events/incident';
import type { CreateIncidentInput } from '../../lib/nostr/events/types';

class MockNDK {
  explicitRelayUrls: string[] = ['wss://localhost:8443'];
}

describe('createIncidentEvent report metadata', () => {
  it('preserves stillActive report metadata in the event content', () => {
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 4,
      title: 'Structure Fire',
      description: 'Visible flames from the rear of the building.',
      location: {
        lat: 39.9526,
        lng: -75.1652,
        address: '1234 Main St',
      },
      occurredAt: new Date('2026-04-15T18:00:00Z'),
      source: 'community',
      sourceId: 'community-test-1',
      metadata: {
        entrypoint: 'report-incident-flow',
        stillActive: true,
        reportStatus: 'active',
      },
    };

    const event = createIncidentEvent(new MockNDK() as any, input);
    const content = JSON.parse(event.content);

    expect(content.metadata).toEqual({
      entrypoint: 'report-incident-flow',
      stillActive: true,
      reportStatus: 'active',
    });
  });

  it('adds an alt tag for custom-kind compatibility', () => {
    const input: CreateIncidentInput = {
      incidentId: 'community-test-alt',
      type: 'fire',
      severity: 4,
      title: 'Structure Fire near warehouse',
      description: 'Smoke visible from loading dock.',
      location: {
        lat: 39.9526,
        lng: -75.1652,
        address: '1200 Warehouse Row',
      },
      occurredAt: new Date('2026-04-20T19:01:25Z'),
      source: 'community',
      sourceId: 'community-test-alt',
    };

    const event = createIncidentEvent(new MockNDK() as any, input);
    const altTag = event.tags.find((tag) => tag[0] === 'alt')?.[1];

    expect(altTag).toBe('Incident report: Structure Fire near warehouse');
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const originalCrypto = global.crypto;
    const getRandomValues = jest.fn((array: Uint8Array) => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = index;
      }
      return array;
    });

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    });

    try {
      const input: CreateIncidentInput = {
        type: 'suspicious',
        severity: 2,
        title: 'Suspicious activity',
        description: 'LOCAL RELAY QA fallback id regression coverage.',
        location: {
          lat: 39.9526,
          lng: -75.1652,
          address: '3100 block Princeton Avenue',
        },
        occurredAt: new Date('2026-04-20T19:01:25Z'),
        source: 'community',
        sourceId: 'community-test-fallback',
      };

      const event = createIncidentEvent(new MockNDK() as any, input);
      const incidentId = event.tags.find((tag) => tag[0] === 'd')?.[1];

      expect(getRandomValues).toHaveBeenCalledTimes(1);
      expect(incidentId).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    } finally {
      Object.defineProperty(global, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it('throws when no secure RNG is available for incidentId generation', () => {
    const originalCrypto = global.crypto;

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {},
    });

    try {
      const input: CreateIncidentInput = {
        type: 'suspicious',
        severity: 2,
        title: 'Suspicious activity',
        description: 'Secure RNG regression coverage.',
        location: {
          lat: 39.9526,
          lng: -75.1652,
          address: '3100 block Princeton Avenue',
        },
        occurredAt: new Date('2026-04-20T19:01:25Z'),
        source: 'community',
        sourceId: 'community-test-missing-rng',
      };

      expect(() => createIncidentEvent(new MockNDK() as any, input)).toThrow(
        'Secure RNG unavailable for incidentId generation.'
      );
    } finally {
      Object.defineProperty(global, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
