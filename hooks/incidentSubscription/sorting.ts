import type { ParsedIncident } from '@lib/nostr/events/types';
import { distanceBetweenCoordinatesMeters } from '@lib/utils/locationDistance';
import { type SeverityCounts, type ProcessedIncident, type ProcessedIncidentSortInput } from './types';

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
  const distanceMeters = distanceBetweenCoordinatesMeters(
    { latitude: userLat, longitude: userLng },
    { latitude: incidentLat, longitude: incidentLng }
  );
  return distanceMeters ?? Number.POSITIVE_INFINITY;
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
  const effectiveMinOccurredAtMs =
    typeof input.minOccurredAtMs === 'number' && Number.isFinite(input.minOccurredAtMs)
      ? input.minOccurredAtMs
      : null;
  const filteredIncidents =
    effectiveMinOccurredAtMs !== null
      ? Array.from(input.incidentMap.values()).filter(
          (incident) => incident.occurredAtMs >= effectiveMinOccurredAtMs
        )
      : Array.from(input.incidentMap.values());
  const sorted = sortIncidentsForDisplay(filteredIncidents, input.location);
  const incidents = sorted.slice(0, input.maxIncidents);

  const severityCounts: SeverityCounts = { ...EMPTY_SEVERITY_COUNTS };
  for (const incident of incidents) {
    severityCounts[incident.severity]++;
  }

  return { incidents, severityCounts };
}

export { EMPTY_SEVERITY_COUNTS };
