/**
 * IncidentMarker incident variant and edge-case behavior.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  createMockIncident,
  dataSources,
  IncidentMarker,
  incidentTypes,
  renderIncidentMarker,
  resetIncidentMarkerMocks,
} from './incidentMarkerTestHarness';

describe('IncidentMarker variants and edge cases', () => {
  beforeEach(resetIncidentMarkerMocks);

  it.each(incidentTypes)('renders %s incident type', (type) => {
    const incident = createMockIncident({ type });
    const { toJSON } = renderIncidentMarker(incident);

    expect(toJSON()).not.toBeNull();
  });

  it('keeps marker appearance independent of incident type', () => {
    const fireIncident = createMockIncident({ type: 'fire', severity: 3 });
    const medicalIncident = createMockIncident({ type: 'medical', severity: 3 });

    const { getByText: getByTextFire } = renderIncidentMarker(fireIncident);
    const { getByText: getByTextMedical } = renderIncidentMarker(medicalIncident);

    expect(getByTextFire('3')).toBeTruthy();
    expect(getByTextMedical('3')).toBeTruthy();
  });

  it.each(dataSources)('renders incident from %s source', (source) => {
    const incident = createMockIncident({ source });
    const { toJSON } = renderIncidentMarker(incident);

    expect(toJSON()).not.toBeNull();
  });

  it('handles incident with minimal location data', () => {
    const incident = createMockIncident({
      location: {
        lat: 0,
        lng: 0,
        address: '',
        geohash: '',
      },
    });

    const { toJSON } = renderIncidentMarker(incident);
    expect(toJSON()).not.toBeNull();
  });

  it('handles incident with very long title', () => {
    const incident = createMockIncident({ title: 'A'.repeat(500) });
    const { toJSON } = renderIncidentMarker(incident);

    expect(toJSON()).not.toBeNull();
  });

  it('handles incident with very long description', () => {
    const incident = createMockIncident({ description: 'B'.repeat(5000) });
    const { toJSON } = renderIncidentMarker(incident);

    expect(toJSON()).not.toBeNull();
  });

  it('handles incident with metadata', () => {
    const incident = createMockIncident({
      metadata: {
        customField: 'custom value',
        nestedObject: { key: 'value' },
        arrayField: [1, 2, 3],
      },
    });

    const { toJSON } = renderIncidentMarker(incident);
    expect(toJSON()).not.toBeNull();
  });

  it('renders consistently across multiple instances', () => {
    const incident1 = createMockIncident({ incidentId: 'incident-1' });
    const incident2 = createMockIncident({ incidentId: 'incident-2' });
    const incident3 = createMockIncident({ incidentId: 'incident-3' });

    const { toJSON } = render(
      <>
        <IncidentMarker incident={incident1} />
        <IncidentMarker incident={incident2} />
        <IncidentMarker incident={incident3} />
      </>
    );

    expect(toJSON()).not.toBeNull();
  });

  it('renders verified and unverified incidents consistently', () => {
    const verifiedIncident = createMockIncident({
      isVerified: true,
      severity: 3,
    });
    const unverifiedIncident = createMockIncident({
      isVerified: false,
      severity: 3,
    });

    const { getByText: getByTextVerified } = renderIncidentMarker(verifiedIncident);
    const { getByText: getByTextUnverified } = renderIncidentMarker(
      unverifiedIncident
    );

    expect(getByTextVerified('3')).toBeTruthy();
    expect(getByTextUnverified('3')).toBeTruthy();
  });
});
