/**
 * Shared harness for IncidentMarker behavior tests.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { IncidentMarker as IncidentMarkerComponent } from '../../../components/map/IncidentMarker';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { DataSource, IncidentType, Severity } from '@lib/nostr/config';

jest.mock('@lib/map/types', () => ({
  incidentToCoordinate: jest.fn((incident) => [
    incident.location.lng,
    incident.location.lat,
  ]),
  getSeverityColor: jest.fn((incident) => {
    const colors: Record<number, string> = {
      1: '#6B7280',
      2: '#3B82F6',
      3: '#F59E0B',
      4: '#EA580C',
      5: '#DC2626',
    };
    return colors[incident.severity] || colors[1];
  }),
}));

export const allSeverityLevels: Severity[] = [1, 2, 3, 4, 5];

export const incidentTypes: IncidentType[] = [
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

export const dataSources: DataSource[] = [
  'crimeometer',
  'opendataphilly',
  'radio',
  'community',
  'nj_transit_rss',
  'nj_511_rss',
];

export const createMockIncident = (
  overrides: Partial<ParsedIncident> = {}
): ParsedIncident => ({
  eventId: 'event123',
  incidentId: 'incident456',
  pubkey: 'pubkey789',
  createdAt: Math.floor(Date.now() / 1000),
  type: 'fire',
  severity: 3,
  title: 'Test Fire Incident',
  description: 'A test fire incident for testing purposes',
  location: {
    lat: 39.9526,
    lng: -75.1652,
    address: '123 Test Street',
    city: 'Philadelphia',
    state: 'PA',
    geohash: 'dr4e8',
  },
  occurredAt: new Date(),
  source: 'crimeometer',
  sourceId: 'source123',
  isVerified: true,
  ...overrides,
});

export const renderIncidentMarker = (
  incident = createMockIncident(),
  onPress?: (incident: ParsedIncident) => void
) => render(<IncidentMarkerComponent incident={incident} onPress={onPress} />);

export const IncidentMarker = IncidentMarkerComponent;

export const parseMarkerCoordinate = (markerView: {
  props: Record<string, unknown>;
}) => JSON.parse(String(markerView.props['data-coordinate'] || '[]'));

export const mapTypeMocks = jest.requireMock('@lib/map/types') as {
  incidentToCoordinate: jest.Mock;
  getSeverityColor: jest.Mock;
};

export const resetIncidentMarkerMocks = () => {
  jest.clearAllMocks();
};
