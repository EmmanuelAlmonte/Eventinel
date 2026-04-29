const {
  buildReportSubmitFilter,
  buildReportSubmitSummary,
  getProbeRelayUrls,
  matchesContains,
} = require('../../scripts/report-submit-probe.js');
const { parseArgs } = require('../../scripts/incident-probe-utils.js');

describe('report-submit-probe', () => {
  it('defaults host-side probing to the local Netstr relay', () => {
    const relays = getProbeRelayUrls(parseArgs([]));

    expect(relays).toEqual(['ws://127.0.0.1:8085']);
  });

  it('builds a report incident filter with author and since lower bound', () => {
    const filter = buildReportSubmitFilter({
      author: 'pubkey-123',
      sinceSeconds: 1700000000,
      limit: 10,
    });

    expect(filter).toEqual({
      kinds: [30911],
      authors: ['pubkey-123'],
      since: 1700000000,
      limit: 10,
    });
  });

  it('matches distinctive submit text from incident content', () => {
    const event = {
      id: 'event-id-1',
      content: JSON.stringify({
        title: 'Suspicious activity report',
        description: 'LOCAL RELAY QA 2026-04-20 14:15',
        sourceId: 'community-1',
      }),
      tags: [
        ['d', 'incident-1'],
        ['address', '123 Main St'],
        ['type', 'suspicious'],
      ],
    };

    expect(matchesContains(event, 'local relay qa 2026-04-20 14:15')).toBe(true);
    expect(matchesContains(event, 'not present')).toBe(false);
  });

  it('summarizes recent report events into readable fields', () => {
    const summary = buildReportSubmitSummary([
      {
        id: 'event-id-1',
        created_at: 1700000010,
        content: JSON.stringify({
          title: 'Fire report',
          description: 'Smoke visible from block',
          sourceId: 'community-1',
        }),
        tags: [
          ['d', 'incident-1'],
          ['address', '123 Main St'],
          ['type', 'fire'],
        ],
      },
    ]);

    expect(summary).toEqual([
      {
        id: 'event-id-1',
        incidentId: 'incident-1',
        createdAt: 1700000010,
        type: 'fire',
        address: '123 Main St',
        title: 'Fire report',
        description: 'Smoke visible from block',
        sourceId: 'community-1',
      },
    ]);
  });
});
