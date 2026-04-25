/**
 * IncidentMarker press and prop-update behavior.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createMockIncident,
  IncidentMarker,
  mapTypeMocks,
  renderIncidentMarker,
  resetIncidentMarkerMocks,
} from './incidentMarkerTestHarness';

describe('IncidentMarker interactions and updates', () => {
  beforeEach(resetIncidentMarkerMocks);

  it('calls onPress callback when marker is pressed', () => {
    const mockOnPress = jest.fn();
    const incident = createMockIncident();
    const { getByText } = renderIncidentMarker(incident, mockOnPress);

    fireEvent.press(getByText(String(incident.severity)));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('passes the incident to onPress callback', () => {
    const mockOnPress = jest.fn();
    const incident = createMockIncident({
      incidentId: 'specific-id-123',
      title: 'Specific Test Incident',
    });

    const { getByText } = renderIncidentMarker(incident, mockOnPress);
    fireEvent.press(getByText(String(incident.severity)));

    expect(mockOnPress).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'specific-id-123',
        title: 'Specific Test Incident',
      })
    );
  });

  it('does not crash when onPress is not provided', () => {
    const incident = createMockIncident();
    const { getByText } = renderIncidentMarker(incident);

    expect(() => fireEvent.press(getByText(String(incident.severity)))).not.toThrow();
  });

  it('handles multiple presses correctly', () => {
    const mockOnPress = jest.fn();
    const incident = createMockIncident();
    const { getByText } = renderIncidentMarker(incident, mockOnPress);
    const severityText = getByText(String(incident.severity));

    fireEvent.press(severityText);
    fireEvent.press(severityText);
    fireEvent.press(severityText);

    expect(mockOnPress).toHaveBeenCalledTimes(3);
  });

  it('passes full incident object on press', () => {
    const mockOnPress = jest.fn();
    const incident = createMockIncident({
      eventId: 'full-event-id',
      incidentId: 'full-incident-id',
      type: 'medical',
      severity: 4,
      title: 'Medical Emergency',
      description: 'Full description',
      source: 'radio',
    });

    const { getByText } = renderIncidentMarker(incident, mockOnPress);
    fireEvent.press(getByText('4'));

    expect(mockOnPress).toHaveBeenCalledWith(incident);
  });

  it('updates when incident prop changes', () => {
    const incident1 = createMockIncident({ severity: 2 });
    const incident2 = createMockIncident({ severity: 5 });

    const { getByText, rerender, queryByText } = renderIncidentMarker(incident1);

    expect(getByText('2')).toBeTruthy();

    rerender(<IncidentMarker incident={incident2} />);

    expect(queryByText('2')).toBeNull();
    expect(getByText('5')).toBeTruthy();
  });

  it('updates coordinates when location changes', () => {
    const incident1 = createMockIncident({
      location: {
        lat: 40.0,
        lng: -75.0,
        address: 'Location 1',
        geohash: 'dr4xx',
      },
    });
    const incident2 = createMockIncident({
      location: {
        lat: 41.0,
        lng: -76.0,
        address: 'Location 2',
        geohash: 'dr5yy',
      },
    });

    const { rerender } = renderIncidentMarker(incident1);

    expect(mapTypeMocks.incidentToCoordinate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ lat: 40.0, lng: -75.0 }),
      })
    );

    rerender(<IncidentMarker incident={incident2} />);

    expect(mapTypeMocks.incidentToCoordinate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ lat: 41.0, lng: -76.0 }),
      })
    );
  });

  it('updates onPress handler when prop changes', () => {
    const mockOnPress1 = jest.fn();
    const mockOnPress2 = jest.fn();
    const incident = createMockIncident();

    const { getByText, rerender } = renderIncidentMarker(incident, mockOnPress1);
    const severityText = getByText(String(incident.severity));

    fireEvent.press(severityText);

    expect(mockOnPress1).toHaveBeenCalledTimes(1);
    expect(mockOnPress2).not.toHaveBeenCalled();

    rerender(<IncidentMarker incident={incident} onPress={mockOnPress2} />);
    fireEvent.press(severityText);

    expect(mockOnPress1).toHaveBeenCalledTimes(1);
    expect(mockOnPress2).toHaveBeenCalledTimes(1);
  });
});
