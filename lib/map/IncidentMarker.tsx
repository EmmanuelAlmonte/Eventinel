/**
 * Incident Marker Component
 *
 * Renders an individual incident as a clickable marker on the Mapbox map
 * with severity-based color coding.
 */

import { View, Text, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import type { ParsedIncident } from '../nostr/events/types';
import { incidentToCoordinate, getSeverityColor } from './types';
import { INCIDENT_MARKER } from './constants';

// =============================================================================
// TYPES
// =============================================================================

interface IncidentMarkerProps {
  /**
   * Parsed incident event to display
   */
  incident: ParsedIncident;

  /**
   * Callback when marker is tapped/selected
   */
  onPress?: (incident: ParsedIncident) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * IncidentMarker Component
 *
 * Displays a single incident on the map with:
 * - Severity-based color (green to dark red)
 * - Severity number displayed inside pin
 * - Tap handler for showing incident details
 *
 * @example
 * ```tsx
 * <IncidentMarker
 *   incident={parsedIncident}
 *   onPress={(incident) => showDetails(incident)}
 * />
 * ```
 */
export function IncidentMarker({ incident, onPress }: IncidentMarkerProps) {
  const coordinate = incidentToCoordinate(incident);
  const color = getSeverityColor(incident);

  const handlePress = () => {
    onPress?.(incident);
  };

  return (
    <Mapbox.PointAnnotation
      id={incident.incidentId}
      coordinate={coordinate}
      onSelected={handlePress}
    >
      <View style={styles.container}>
        <View style={[styles.pin, { backgroundColor: color }]}>
          <Text style={styles.severityText}>{incident.severity}</Text>
        </View>
      </View>
    </Mapbox.PointAnnotation>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pin: {
    width: INCIDENT_MARKER.PIN_SIZE,
    height: INCIDENT_MARKER.PIN_SIZE,
    borderRadius: INCIDENT_MARKER.PIN_SIZE / 2,
    borderWidth: INCIDENT_MARKER.PIN_BORDER_WIDTH,
    borderColor: INCIDENT_MARKER.PIN_BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevation for Android
    elevation: 5,
  },

  severityText: {
    color: INCIDENT_MARKER.TEXT_COLOR,
    fontSize: INCIDENT_MARKER.TEXT_FONT_SIZE,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
