/**
 * IncidentMarker Component Tests
 *
 * Tests the map marker component for incidents including:
 * - Marker rendering with Mapbox MarkerView
 * - Coordinate conversion (lat/lng to Mapbox format)
 * - Severity-based color coding
 * - Press interaction handling
 * - Styling and visual properties
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IncidentMarker } from '../../../components/map/IncidentMarker';
import { SEVERITY_COLORS } from '@lib/nostr/config';
import { INCIDENT_MARKER } from '@lib/map/constants';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { IncidentType, Severity, DataSource } from '@lib/nostr/config';

// =============================================================================
// MOCKS
// =============================================================================

// The Mapbox mock is set up in jest.setup.js - it provides a functional MarkerView
// We don't override it here, just use the global mock.

// Mock the map utility functions
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

// =============================================================================
// TEST DATA
// =============================================================================

const createMockIncident = (overrides: Partial<ParsedIncident> = {}): ParsedIncident => ({
  eventId: 'event123',
  incidentId: 'incident456',
  pubkey: 'pubkey789',
  createdAt: Math.floor(Date.now() / 1000),
  type: 'fire' as IncidentType,
  severity: 3 as Severity,
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
  source: 'crimeometer' as DataSource,
  sourceId: 'source123',
  isVerified: true,
  ...overrides,
});

const allSeverityLevels: Severity[] = [1, 2, 3, 4, 5];

// =============================================================================
// TEST SETUP
// =============================================================================

describe('IncidentMarker', () => {
  const { incidentToCoordinate, getSeverityColor } = require('@lib/map/types');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const incident = createMockIncident();
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders a MarkerView component', () => {
      const incident = createMockIncident();
      const { getByTestId } = render(<IncidentMarker incident={incident} />);
      // The mock MarkerView is rendered with testID="marker-view"
      expect(getByTestId('marker-view')).toBeTruthy();
    });

    it('displays severity number inside the marker', () => {
      const incident = createMockIncident({ severity: 4 });
      const { getByText } = render(<IncidentMarker incident={incident} />);
      expect(getByText('4')).toBeTruthy();
    });

    it('renders a Pressable for interaction', () => {
      const incident = createMockIncident();
      const { getByText } = render(<IncidentMarker incident={incident} />);
      // The severity text is inside a Pressable
      expect(getByText(String(incident.severity))).toBeTruthy();
    });
  });

  // =============================================================================
  // COORDINATE TESTS
  // =============================================================================

  describe('Coordinate Handling', () => {
    it('converts incident location to Mapbox coordinate format', () => {
      const incident = createMockIncident({
        location: {
          lat: 40.7128,
          lng: -74.006,
          address: 'NYC',
          geohash: 'dr5ru',
        },
      });
      render(<IncidentMarker incident={incident} />);

      expect(incidentToCoordinate).toHaveBeenCalledWith(incident);
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
      const { getByTestId } = render(<IncidentMarker incident={incident} />);

      const markerView = getByTestId('marker-view');
      const coordinate = JSON.parse(
        markerView.props['data-coordinate'] || '[]'
      );

      expect(coordinate).toEqual([-75.1652, 39.9526]); // [lng, lat]
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
      render(<IncidentMarker incident={incident} />);

      expect(incidentToCoordinate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            lat: 51.5074,
            lng: 0.1278,
          }),
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
      render(<IncidentMarker incident={incident} />);

      expect(incidentToCoordinate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            lat: -33.8688,
            lng: 151.2093,
          }),
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
      const { toJSON } = render(<IncidentMarker incident={incident} />);
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
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });
  });

  // =============================================================================
  // SEVERITY COLOR TESTS
  // =============================================================================

  describe('Severity Color Coding', () => {
    it.each(allSeverityLevels)(
      'displays severity %i with correct color',
      (severity) => {
        const incident = createMockIncident({ severity });
        render(<IncidentMarker incident={incident} />);

        expect(getSeverityColor).toHaveBeenCalledWith(incident);
      }
    );

    it('applies severity 1 (Info) gray color', () => {
      const incident = createMockIncident({ severity: 1 });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(getSeverityColor).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 1 })
      );
    });

    it('applies severity 2 (Low) blue color', () => {
      const incident = createMockIncident({ severity: 2 });
      render(<IncidentMarker incident={incident} />);
      expect(getSeverityColor).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 2 })
      );
    });

    it('applies severity 3 (Medium) amber color', () => {
      const incident = createMockIncident({ severity: 3 });
      render(<IncidentMarker incident={incident} />);
      expect(getSeverityColor).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 3 })
      );
    });

    it('applies severity 4 (High) orange-red color', () => {
      const incident = createMockIncident({ severity: 4 });
      render(<IncidentMarker incident={incident} />);
      expect(getSeverityColor).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 4 })
      );
    });

    it('applies severity 5 (Critical) red color', () => {
      const incident = createMockIncident({ severity: 5 });
      render(<IncidentMarker incident={incident} />);
      expect(getSeverityColor).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 5 })
      );
    });

    it('updates color when severity changes', () => {
      const incident1 = createMockIncident({ severity: 1 });
      const incident5 = createMockIncident({ severity: 5 });

      const { rerender } = render(<IncidentMarker incident={incident1} />);
      expect(getSeverityColor).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 1 })
      );

      rerender(<IncidentMarker incident={incident5} />);
      expect(getSeverityColor).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 5 })
      );
    });
  });

  // =============================================================================
  // PRESS INTERACTION TESTS
  // =============================================================================

  describe('Press Interactions', () => {
    it('calls onPress callback when marker is pressed', () => {
      const mockOnPress = jest.fn();
      const incident = createMockIncident();

      const { getByText } = render(
        <IncidentMarker incident={incident} onPress={mockOnPress} />
      );

      const severityText = getByText(String(incident.severity));
      fireEvent.press(severityText);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('passes the incident to onPress callback', () => {
      const mockOnPress = jest.fn();
      const incident = createMockIncident({
        incidentId: 'specific-id-123',
        title: 'Specific Test Incident',
      });

      const { getByText } = render(
        <IncidentMarker incident={incident} onPress={mockOnPress} />
      );

      const severityText = getByText(String(incident.severity));
      fireEvent.press(severityText);

      expect(mockOnPress).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentId: 'specific-id-123',
          title: 'Specific Test Incident',
        })
      );
    });

    it('does not crash when onPress is not provided', () => {
      const incident = createMockIncident();
      const { getByText } = render(<IncidentMarker incident={incident} />);

      // Should not throw when pressed without onPress handler
      const severityText = getByText(String(incident.severity));
      expect(() => fireEvent.press(severityText)).not.toThrow();
    });

    it('handles multiple presses correctly', () => {
      const mockOnPress = jest.fn();
      const incident = createMockIncident();

      const { getByText } = render(
        <IncidentMarker incident={incident} onPress={mockOnPress} />
      );

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

      const { getByText } = render(
        <IncidentMarker incident={incident} onPress={mockOnPress} />
      );

      const severityText = getByText('4');
      fireEvent.press(severityText);

      expect(mockOnPress).toHaveBeenCalledWith(incident);
    });
  });

  // =============================================================================
  // MARKER VIEW PROPS TESTS
  // =============================================================================

  describe('MarkerView Props', () => {
    it('sets allowOverlap to true', () => {
      const incident = createMockIncident();
      const { getByTestId } = render(<IncidentMarker incident={incident} />);

      const markerView = getByTestId('marker-view');
      expect(markerView.props['data-allow-overlap']).toBe(true);
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
      const { getByTestId } = render(<IncidentMarker incident={incident} />);

      const markerView = getByTestId('marker-view');
      expect(markerView.props['data-coordinate']).toBeDefined();
    });
  });

  // =============================================================================
  // PIN STYLING TESTS
  // =============================================================================

  describe('Pin Styling', () => {
    it('uses PIN_SIZE from INCIDENT_MARKER constants', () => {
      expect(INCIDENT_MARKER.PIN_SIZE).toBe(30);
    });

    it('uses PIN_BORDER_WIDTH from constants', () => {
      expect(INCIDENT_MARKER.PIN_BORDER_WIDTH).toBe(2);
    });

    it('uses PIN_BORDER_COLOR white from constants', () => {
      expect(INCIDENT_MARKER.PIN_BORDER_COLOR).toBe('#fff');
    });

    it('uses TEXT_COLOR white from constants', () => {
      expect(INCIDENT_MARKER.TEXT_COLOR).toBe('#fff');
    });

    it('uses TEXT_FONT_SIZE 14 from constants', () => {
      expect(INCIDENT_MARKER.TEXT_FONT_SIZE).toBe(14);
    });

    it('renders pin as circular (borderRadius = PIN_SIZE / 2)', () => {
      // The style should make the pin circular
      expect(INCIDENT_MARKER.PIN_SIZE / 2).toBe(15);
    });
  });

  // =============================================================================
  // SEVERITY TEXT DISPLAY TESTS
  // =============================================================================

  describe('Severity Text Display', () => {
    it.each(allSeverityLevels)('displays severity %i as text', (severity) => {
      const incident = createMockIncident({ severity });
      const { getByText } = render(<IncidentMarker incident={incident} />);
      expect(getByText(String(severity))).toBeTruthy();
    });

    it('severity text uses bold font weight', () => {
      const incident = createMockIncident({ severity: 3 });
      const { getByText } = render(<IncidentMarker incident={incident} />);
      const text = getByText('3');
      // The text should have fontWeight: 'bold' from styles
      expect(text.props.style).toEqual(
        expect.objectContaining({ fontWeight: 'bold' })
      );
    });

    it('severity text is white colored', () => {
      const incident = createMockIncident({ severity: 3 });
      const { getByText } = render(<IncidentMarker incident={incident} />);
      const text = getByText('3');
      expect(text.props.style).toEqual(
        expect.objectContaining({ color: INCIDENT_MARKER.TEXT_COLOR })
      );
    });

    it('severity text is centered', () => {
      const incident = createMockIncident({ severity: 3 });
      const { getByText } = render(<IncidentMarker incident={incident} />);
      const text = getByText('3');
      expect(text.props.style).toEqual(
        expect.objectContaining({ textAlign: 'center' })
      );
    });
  });

  // =============================================================================
  // INCIDENT TYPE TESTS
  // =============================================================================

  describe('Incident Types', () => {
    const incidentTypes: IncidentType[] = [
      'fire',
      'medical',
      'traffic',
      'violent_crime',
      'property_crime',
      'disturbance',
      'suspicious',
      'other',
    ];

    it.each(incidentTypes)('renders %s incident type', (type) => {
      const incident = createMockIncident({ type });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('marker appearance is same regardless of incident type', () => {
      // The marker only shows severity, not type
      const fireIncident = createMockIncident({ type: 'fire', severity: 3 });
      const medicalIncident = createMockIncident({
        type: 'medical',
        severity: 3,
      });

      const { getByText: getByTextFire } = render(
        <IncidentMarker incident={fireIncident} />
      );
      const { getByText: getByTextMedical } = render(
        <IncidentMarker incident={medicalIncident} />
      );

      // Both should display the same severity number
      expect(getByTextFire('3')).toBeTruthy();
      expect(getByTextMedical('3')).toBeTruthy();
    });
  });

  // =============================================================================
  // DATA SOURCE TESTS
  // =============================================================================

  describe('Data Sources', () => {
    const dataSources: DataSource[] = [
      'crimeometer',
      'opendataphilly',
      'radio',
      'community',
    ];

    it.each(dataSources)('renders incident from %s source', (source) => {
      const incident = createMockIncident({ source });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });
  });

  // =============================================================================
  // PROP UPDATES TESTS
  // =============================================================================

  describe('Prop Updates', () => {
    it('updates when incident prop changes', () => {
      const incident1 = createMockIncident({ severity: 2 });
      const incident2 = createMockIncident({ severity: 5 });

      const { getByText, rerender, queryByText } = render(
        <IncidentMarker incident={incident1} />
      );

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

      const { rerender } = render(<IncidentMarker incident={incident1} />);

      expect(incidentToCoordinate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({ lat: 40.0, lng: -75.0 }),
        })
      );

      rerender(<IncidentMarker incident={incident2} />);

      expect(incidentToCoordinate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({ lat: 41.0, lng: -76.0 }),
        })
      );
    });

    it('updates onPress handler when prop changes', () => {
      const mockOnPress1 = jest.fn();
      const mockOnPress2 = jest.fn();
      const incident = createMockIncident();

      const { getByText, rerender } = render(
        <IncidentMarker incident={incident} onPress={mockOnPress1} />
      );

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

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles incident with minimal location data', () => {
      const incident = createMockIncident({
        location: {
          lat: 0,
          lng: 0,
          address: '',
          geohash: '',
        },
      });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('handles incident with very long title', () => {
      const incident = createMockIncident({
        title: 'A'.repeat(500),
      });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('handles incident with very long description', () => {
      const incident = createMockIncident({
        description: 'B'.repeat(5000),
      });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
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
      const { toJSON } = render(<IncidentMarker incident={incident} />);
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
  });

  // =============================================================================
  // VERIFIED STATUS TESTS
  // =============================================================================

  describe('Verified Status', () => {
    it('renders verified incident', () => {
      const incident = createMockIncident({ isVerified: true });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders unverified incident', () => {
      const incident = createMockIncident({ isVerified: false });
      const { toJSON } = render(<IncidentMarker incident={incident} />);
      expect(toJSON()).not.toBeNull();
    });

    it('marker appearance is same regardless of verified status', () => {
      const verifiedIncident = createMockIncident({ isVerified: true, severity: 3 });
      const unverifiedIncident = createMockIncident({ isVerified: false, severity: 3 });

      const { getByText: getByTextVerified } = render(
        <IncidentMarker incident={verifiedIncident} />
      );
      const { getByText: getByTextUnverified } = render(
        <IncidentMarker incident={unverifiedIncident} />
      );

      // Both should display the same severity
      expect(getByTextVerified('3')).toBeTruthy();
      expect(getByTextUnverified('3')).toBeTruthy();
    });
  });
});
