/**
 * Incident Event Builder Tests
 */

import { createIncidentEvent } from '../../../../lib/nostr/events/incident';
import type { CreateIncidentInput } from '../../../../lib/nostr/events/types';

class MockNDK {
  explicitRelayUrls: string[] = ['wss://localhost:8443'];
}

const MEDIA_HASH = 'a'.repeat(64);

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
    expect(tags.find((t) => t[0] === 'g')).toBeDefined(); // geohash
    expect(tags.find((t) => t[0] === 'l')).toBeUndefined(); // lat,lng currently stored in content
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
    expect(geohashTag?.length).toBe(6); // Current default precision
  });

  it('adds Blossom media metadata tags to incident report events', () => {
    const input: CreateIncidentInput = {
      type: 'fire',
      severity: 4,
      title: 'Test',
      description: 'Test',
      location: { lat: 39.95, lng: -75.16, address: 'Test' },
      occurredAt: new Date(),
      source: 'community',
      sourceId: 'community-media-test',
      mediaAttachments: [
        {
          url: `https://cdn.example.com/${MEDIA_HASH}.jpg`,
          sha256: MEDIA_HASH,
          mimeType: 'image/jpeg',
          size: 12345,
          width: 640,
          height: 480,
        },
      ],
    };

    const event = createIncidentEvent(mockNDK, input);

    expect(event.tags).toEqual(
      expect.arrayContaining([
        [
          'imeta',
          `url https://cdn.example.com/${MEDIA_HASH}.jpg`,
          `x ${MEDIA_HASH}`,
          'm image/jpeg',
          'size 12345',
          'dim 640x480',
        ],
        ['r', `https://cdn.example.com/${MEDIA_HASH}.jpg`],
        ['x', MEDIA_HASH],
        ['m', 'image/jpeg'],
        ['size', '12345'],
        ['dim', '640x480'],
      ])
    );
  });
});
