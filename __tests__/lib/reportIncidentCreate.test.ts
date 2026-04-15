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
});
