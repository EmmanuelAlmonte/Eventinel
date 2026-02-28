import type { ParsedIncident } from '@lib/nostr/events/types';
import { type SeverityCounts, type ProcessedIncident, type ProcessedIncidentSortInput } from './types';

const EARTH_RADIUS_METERS = 6371000;
const EMPTY_SEVERITY_COUNTS: SeverityCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export interface IncidentDisplayState {
  incidents: ProcessedIncident[];
  severityCounts: SeverityCounts;
}

export function toProcessedIncident(parsed: ParsedIncident): ProcessedIncident {
  const createdAtMs = parsed.createdAt * 1000;
  const occurredAtMs =
    parsed.occurredAt instanceof Date && !Number.isNaN(parsed.occurredAt.getTime())
      ? parsed.occurredAt.getTime()
      : createdAtMs;

  return {
    ...parsed,
    createdAtMs,
    occurredAtMs,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceFromLocationMeters(
  incident: ProcessedIncident,
  location: [number, number] | null
): number {
  if (!location) {
    return Number.POSITIVE_INFINITY;
  }

  const [userLng, userLat] = location;
  const { lat: incidentLat, lng: incidentLng } = incident.location;

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(incidentLat) ||
    !Number.isFinite(incidentLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const lat1 = toRadians(userLat);
  const lat2 = toRadians(incidentLat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(incidentLng - userLng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const normalizedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA));

  return EARTH_RADIUS_METERS * c;
}

export function sortIncidentsForDisplay(
  incidents: ProcessedIncident[],
  location: [number, number] | null
): ProcessedIncident[] {
  const entries = incidents.map((incident) => ({
    incident,
    distanceMeters: distanceFromLocationMeters(incident, location),
  }));

  entries.sort((a, b) => {
    const distanceDelta = a.distanceMeters - b.distanceMeters;
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    const occurredDelta = b.incident.occurredAtMs - a.incident.occurredAtMs;
    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return a.incident.incidentId.localeCompare(b.incident.incidentId);
  });

  return entries.map((entry) => entry.incident);
}

export function sortIncidentsForRetention(incidents: ProcessedIncident[]): ProcessedIncident[] {
  return [...incidents].sort((a, b) => {
    const occurredDelta = b.occurredAtMs - a.occurredAtMs;
    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return a.incidentId.localeCompare(b.incidentId);
  });
}

export function buildIncidentDisplayState(input: ProcessedIncidentSortInput): IncidentDisplayState {
  const sorted = sortIncidentsForDisplay(Array.from(input.incidentMap.values()), input.location);
  const incidents = sorted.slice(0, input.maxIncidents);

  const severityCounts: SeverityCounts = { ...EMPTY_SEVERITY_COUNTS };
  for (const incident of incidents) {
    severityCounts[incident.severity]++;
  }

  return { incidents, severityCounts };
}

export { EMPTY_SEVERITY_COUNTS };
