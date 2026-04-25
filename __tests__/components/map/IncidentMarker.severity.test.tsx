/**
 * IncidentMarker severity color and text behavior.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { INCIDENT_MARKER } from '@lib/map/constants';
import {
  allSeverityLevels,
  createMockIncident,
  IncidentMarker,
  mapTypeMocks,
  renderIncidentMarker,
  resetIncidentMarkerMocks,
} from './incidentMarkerTestHarness';

describe('IncidentMarker severity display', () => {
  beforeEach(resetIncidentMarkerMocks);

  it.each(allSeverityLevels)(
    'displays severity %i with the derived marker color',
    (severity) => {
      const incident = createMockIncident({ severity });

      renderIncidentMarker(incident);

      expect(mapTypeMocks.getSeverityColor).toHaveBeenCalledWith(incident);
    }
  );

  it.each(allSeverityLevels)('displays severity %i as text', (severity) => {
    const incident = createMockIncident({ severity });
    const { getByText } = renderIncidentMarker(incident);

    expect(getByText(String(severity))).toBeTruthy();
  });

  it('updates color when severity changes', () => {
    const incident1 = createMockIncident({ severity: 1 });
    const incident5 = createMockIncident({ severity: 5 });

    const { rerender } = renderIncidentMarker(incident1);
    expect(mapTypeMocks.getSeverityColor).toHaveBeenLastCalledWith(
      expect.objectContaining({ severity: 1 })
    );

    rerender(<IncidentMarker incident={incident5} />);

    expect(mapTypeMocks.getSeverityColor).toHaveBeenLastCalledWith(
      expect.objectContaining({ severity: 5 })
    );
  });

  it('styles severity text as centered bold white text', () => {
    const incident = createMockIncident({ severity: 3 });
    const { getByText } = renderIncidentMarker(incident);
    const text = getByText('3');

    expect(text.props.style).toEqual(
      expect.objectContaining({
        color: INCIDENT_MARKER.TEXT_COLOR,
        fontSize: INCIDENT_MARKER.TEXT_FONT_SIZE,
        fontWeight: 'bold',
        textAlign: 'center',
      })
    );
  });
});
