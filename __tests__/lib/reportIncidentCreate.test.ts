import { createIncidentEvent } from '../../lib/nostr/events/incident';
import { INCIDENT_LIMITS } from '../../lib/map/constants';
import { buildIncidentReportInput } from '../fixtures/report/buildIncidentReportInput';

class MockNDK {
  explicitRelayUrls: string[] = ['wss://localhost:8443'];
}

describe('createIncidentEvent report metadata', () => {
  it('preserves stillActive report metadata in the event content', () => {
    const input = buildIncidentReportInput({
      title: 'Structure Fire',
      description: 'Visible flames from the rear of the building.',
      location: {
        address: '1234 Main St',
      },
      occurredAt: new Date('2026-04-15T18:00:00Z'),
      sourceId: 'community-test-1',
      metadata: {
        entrypoint: 'report-incident-flow',
        stillActive: true,
        reportStatus: 'active',
      },
    });

    const event = createIncidentEvent(new MockNDK() as any, input);
    const content = JSON.parse(event.content);

    expect(content.metadata).toEqual({
      entrypoint: 'report-incident-flow',
      stillActive: true,
      reportStatus: 'active',
    });
  });

  it('adds an alt tag for custom-kind compatibility', () => {
    const input = buildIncidentReportInput({
      incidentId: 'community-test-alt',
      title: 'Structure Fire near warehouse',
      description: 'Smoke visible from loading dock.',
      location: {
        address: '1200 Warehouse Row',
      },
      sourceId: 'community-test-alt',
    });

    const event = createIncidentEvent(new MockNDK() as any, input);
    const altTag = event.tags.find((tag) => tag[0] === 'alt')?.[1];

    expect(altTag).toBe('Incident report: Structure Fire near warehouse');
  });

  it('caps generated alt tags to the intake tag-value contract', () => {
    const longTitle = `Fire near ${'warehouse access note '.repeat(20)}`;
    const input = buildIncidentReportInput({
      incidentId: 'community-test-long-alt',
      title: longTitle,
      description: 'Smoke visible from loading dock.',
      location: {
        address: '1200 Warehouse Row',
      },
      sourceId: 'community-test-long-alt',
    });

    const firstEvent = createIncidentEvent(new MockNDK() as any, input);
    const secondEvent = createIncidentEvent(new MockNDK() as any, input);
    const altTag = firstEvent.tags.find((tag) => tag[0] === 'alt')?.[1];
    const repeatedAltTag = secondEvent.tags.find((tag) => tag[0] === 'alt')?.[1];
    const content = JSON.parse(firstEvent.content);

    expect(content.title).toBe(longTitle);
    expect(altTag).toHaveLength(INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH);
    expect(altTag).toBe(repeatedAltTag);
    expect(altTag).toBe(`Incident report: ${longTitle}`.slice(0, INCIDENT_LIMITS.MAX_EVENT_TAG_VALUE_LENGTH));
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
      const input = buildIncidentReportInput({
        type: 'suspicious',
        severity: 2,
        title: 'Suspicious activity',
        description: 'LOCAL RELAY QA fallback id regression coverage.',
        sourceId: 'community-test-fallback',
      });

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
      const input = buildIncidentReportInput({
        type: 'suspicious',
        severity: 2,
        title: 'Suspicious activity',
        description: 'Secure RNG regression coverage.',
        sourceId: 'community-test-missing-rng',
      });

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
