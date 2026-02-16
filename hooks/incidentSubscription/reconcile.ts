import type { ProcessedIncident } from './types';
import type { ReconcileInput, ReconcileResult } from './types';

export interface PruneIncidentsByCellInput {
  incidentMap: Map<string, ProcessedIncident>;
  desiredCells: Set<string>;
  geohashPrecision: number;
}

export interface PruneIncidentsByCellResult {
  incidentMap: Map<string, ProcessedIncident>;
  didPrune: boolean;
}

export function computeReconcilePlan({
  enabled,
  desiredCells,
  activeSubscriptionKeys,
}: ReconcileInput): ReconcileResult {
  // Contract: no desired geohash cells means intentionally no subscriptions.
  // This avoids implicit global fallback and keeps relay coverage strictly
  // tied to the planner output.
  const desiredKeys = new Set(enabled && desiredCells.length > 0 ? desiredCells : []);
  const activeKeys = new Set(activeSubscriptionKeys);

  const toAdd = Array.from(desiredKeys).filter((key) => !activeKeys.has(key));
  const toRemove = Array.from(activeKeys).filter((key) => !desiredKeys.has(key));

  return {
    desiredKeys,
    toAdd,
    toRemove,
    shouldPruneByCell: enabled && desiredCells.length > 0,
  };
}

export function computeHasReceivedHistory(
  enabled: boolean,
  activeSubscriptionKeys: Iterable<string>,
  eoseBySubscriptionKey: Map<string, boolean>
): boolean {
  if (!enabled) {
    return false;
  }

  let hasAny = false;
  for (const key of activeSubscriptionKeys) {
    hasAny = true;
    if (eoseBySubscriptionKey.get(key) !== true) {
      return false;
    }
  }

  return hasAny;
}

export function pruneIncidentsByDesiredCells({
  incidentMap,
  desiredCells,
  geohashPrecision,
}: PruneIncidentsByCellInput): PruneIncidentsByCellResult {
  let didPrune = false;

  const next = new Map<string, ProcessedIncident>(incidentMap);
  for (const [incidentId, incident] of incidentMap.entries()) {
    const geohash = incident.location.geohash?.toLowerCase();
    if (!geohash) {
      continue;
    }

    const cell = geohash.slice(0, geohashPrecision);
    if (!desiredCells.has(cell)) {
      next.delete(incidentId);
      didPrune = true;
    }
  }

  return {
    incidentMap: didPrune ? next : incidentMap,
    didPrune,
  };
}
