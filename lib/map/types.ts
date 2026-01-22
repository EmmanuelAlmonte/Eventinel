/**
 * Map Type Definitions and Constants
 *
 * This file contains type definitions, color mappings, and utility functions
 * for the Mapbox map integration with incident markers.
 */

import type { ParsedIncident } from '../nostr/events/types';

// =============================================================================
// SEVERITY COLORS
// =============================================================================

/**
 * Color mapping for incident severity levels (1-5)
 * Used for marker pins to provide visual urgency indication
 */
export const SEVERITY_COLORS = {
  1: '#22c55e', // Green - Low/Info
  2: '#eab308', // Yellow - Moderate
  3: '#f97316', // Orange - Significant
  4: '#ef4444', // Red - High
  5: '#7c2d12', // Dark Red - Critical
} as const;

// =============================================================================
// MAP STYLES
// =============================================================================

/**
 * Mapbox style URLs for different map themes
 */
export const MAP_STYLES = {
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;

// =============================================================================
// DEFAULT CAMERA POSITION
// =============================================================================

/**
 * Default camera position centered on the geographic center of the USA
 * (Near Lebanon, Kansas)
 *
 * IMPORTANT: Mapbox uses [longitude, latitude] order (NOT lat/lng)
 */
export const DEFAULT_CAMERA = {
  centerCoordinate: [-98.5795, 39.8283] as [number, number], // [lng, lat] - Center of USA
  zoomLevel: 4,
  animationDuration: 1000,
};

// =============================================================================
// COORDINATE CONVERSION UTILITIES
// =============================================================================

/**
 * Converts a ParsedIncident to Mapbox coordinate format
 *
 * @param incident - Parsed incident event with location data
 * @returns Tuple [longitude, latitude] for Mapbox API
 *
 * CRITICAL: Mapbox expects [lng, lat] order, not [lat, lng]!
 *
 * @example
 * ```typescript
 * const coordinate = incidentToCoordinate(incident);
 * // coordinate = [-75.1652, 39.9526] // [lng, lat]
 * ```
 */
export function incidentToCoordinate(incident: ParsedIncident): [number, number] {
  return [incident.location.lng, incident.location.lat];
}

/**
 * Gets the severity color for a given incident
 *
 * @param incident - Parsed incident event
 * @returns Hex color string for the incident's severity level
 *
 * @example
 * ```typescript
 * const color = getSeverityColor(incident);
 * // Returns '#ef4444' for severity 4 (High)
 * ```
 */
export function getSeverityColor(incident: ParsedIncident): string {
  return SEVERITY_COLORS[incident.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS[1];
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Map viewport configuration
 */
export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number; // 0-360 degrees
  pitch?: number; // 0-60 degrees
}

/**
 * Map bounds for camera fitting
 */
export interface MapBounds {
  ne: [number, number]; // Northeast corner [lng, lat]
  sw: [number, number]; // Southwest corner [lng, lat]
}
