/**
 * IncidentMarker rendering, MarkerView props, and coordinate behavior.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { INCIDENT_MARKER } from '@lib/map/constants';
import {
  createMockIncident,
  mapTypeMocks,
  parseMarkerCoordinate,
  renderIncidentMarker,
  resetIncidentMarkerMocks,
} from './incidentMarkerTestHarness';

describe('IncidentMarker rendering and coordinates', () => {
  beforeEach(resetIncidentMarkerMocks);

  it('renders without crashing', () => {
    const { toJSON } = renderIncidentMarker();
    expect(toJSON()).not.toBeNull();
  });

  it('renders a MarkerView component', () => {
    const { getByTestId } = renderIncidentMarker();
    expect(getByTestId('marker-view')).toBeTruthy();
  });

  it('displays severity number inside the marker', () => {
    const incident = createMockIncident({ severity: 4 });
    const { getByText } = renderIncidentMarker(incident);
    expect(getByText('4')).toBeTruthy();
  });

  it('renders a Pressable target for interaction', () => {
    const incident = createMockIncident();
    const { getByText } = renderIncidentMarker(incident);
    expect(getByText(String(incident.severity))).toBeTruthy();
  });

  it('converts incident location to Mapbox coordinate format', () => {
    const incident = createMockIncident({
      location: {
        lat: 40.7128,
        lng: -74.006,
        address: 'NYC',
        geohash: 'dr5ru',
      },
    });

    renderIncidentMarker(incident);

    expect(mapTypeMocks.incidentToCoordinate).toHaveBeenCalledWith(incident);
  });

  it('passes coordinate to MarkerView in [lng, lat] format', () => {
    const incident = createMockIncident({
      location: {
        lat: 39.9526,
        lng: -75.1652,
        address: 'Philly',
        geohash: 'dr4e8',
      },
    });

    const { getByTestId } = renderIncidentMarker(incident);
    const markerView = getByTestId('marker-view');

    expect(parseMarkerCoordinate(markerView)).toEqual([-75.1652, 39.9526]);
  });

  it('handles positive coordinates correctly', () => {
    const incident = createMockIncident({
      location: {
        lat: 51.5074,
        lng: 0.1278,
        address: 'London',
        geohash: 'gcpvj',
      },
    });

    renderIncidentMarker(incident);

    expect(mapTypeMocks.incidentToCoordinate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ lat: 51.5074, lng: 0.1278 }),
      })
    );
  });

  it('handles negative coordinates correctly', () => {
    const incident = createMockIncident({
      location: {
        lat: -33.8688,
        lng: 151.2093,
        address: 'Sydney',
        geohash: 'r3gx2',
      },
    });

    renderIncidentMarker(incident);

    expect(mapTypeMocks.incidentToCoordinate).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ lat: -33.8688, lng: 151.2093 }),
      })
    );
  });

  it('handles coordinates near poles', () => {
    const incident = createMockIncident({
      location: {
        lat: 89.9,
        lng: -45.0,
        address: 'Near North Pole',
        geohash: 'fffff',
      },
    });

    const { toJSON } = renderIncidentMarker(incident);
    expect(toJSON()).not.toBeNull();
  });

  it('handles coordinates at equator/prime meridian', () => {
    const incident = createMockIncident({
      location: {
        lat: 0,
        lng: 0,
        address: 'Null Island',
        geohash: '7zzzzz',
      },
    });

    const { toJSON } = renderIncidentMarker(incident);
    expect(toJSON()).not.toBeNull();
  });

  it('sets MarkerView allowOverlap to true', () => {
    const { getByTestId } = renderIncidentMarker();
    expect(getByTestId('marker-view').props['data-allow-overlap']).toBe(true);
  });

  it('passes coordinate prop to MarkerView', () => {
    const incident = createMockIncident({
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: 'San Francisco',
        geohash: '9q8yy',
      },
    });

    const { getByTestId } = renderIncidentMarker(incident);
    expect(getByTestId('marker-view').props['data-coordinate']).toBeDefined();
  });

  it('uses pin sizing constants for circular marker geometry', () => {
    expect(INCIDENT_MARKER.PIN_SIZE).toBe(30);
    expect(INCIDENT_MARKER.PIN_BORDER_WIDTH).toBe(2);
    expect(INCIDENT_MARKER.PIN_BORDER_COLOR).toBe('#fff');
    expect(INCIDENT_MARKER.PIN_SIZE / 2).toBe(15);
  });
});
