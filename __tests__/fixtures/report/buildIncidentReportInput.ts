import type { CreateIncidentInput } from '../../../lib/nostr/events/types';

type IncidentReportLocation = CreateIncidentInput['location'];

type IncidentReportInputOverrides = Omit<Partial<CreateIncidentInput>, 'location'> & {
  location?: Partial<IncidentReportLocation>;
};

export function buildIncidentReportLocation(
  overrides: Partial<IncidentReportLocation> = {}
): IncidentReportLocation {
  return {
    lat: 39.9526,
    lng: -75.1652,
    address: '3100 block Princeton Avenue',
    ...overrides,
  };
}

export function buildIncidentReportInput(
  overrides: IncidentReportInputOverrides = {}
): CreateIncidentInput {
  const { location, ...inputOverrides } = overrides;

  return {
    type: 'fire',
    severity: 4,
    title: 'Structure Fire',
    description: 'Visible flames from the rear of the building.',
    location: buildIncidentReportLocation(location),
    occurredAt: new Date('2026-04-20T19:01:25Z'),
    source: 'community',
    sourceId: 'community-test-1',
    ...inputOverrides,
  };
}
