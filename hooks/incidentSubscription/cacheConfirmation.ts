import type { MutableRefObject } from 'react';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { parseIncidentSubscriptionGroupKey } from '@lib/map/subscriptionPlanner';
import { deleteIncidentEventsFromNdkCache } from '@lib/ndk';
import type { IncidentCacheDeleteTarget } from '@lib/nostr/incidentCacheMaintenance';
import type { ProcessedIncident } from './types';

export type RelayConfirmationMapRef = MutableRefObject<Map<string, Set<string>>>;

export type PruneUnconfirmedIncidentOptions = {
  cellGroupKey?: string;
  shouldPruneIncident?: (incident: ProcessedIncident) => boolean;
};

export function resetRelayConfirmationsForSubscription(
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef,
  subscriptionKey: string
): void {
  relayConfirmedIncidentIdsBySubscriptionKeyRef.current.set(subscriptionKey, new Set());
}

export function clearRelayConfirmations(
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef
): void {
  relayConfirmedIncidentIdsBySubscriptionKeyRef.current.clear();
}

export function deleteRelayConfirmationsForSubscription(
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef,
  subscriptionKey: string
): void {
  relayConfirmedIncidentIdsBySubscriptionKeyRef.current.delete(subscriptionKey);
}

export function markRelayConfirmedIncident(
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef,
  subscriptionKey: string | undefined,
  incidentId: string | null
): void {
  if (!subscriptionKey || !incidentId) {
    return;
  }

  let confirmed = relayConfirmedIncidentIdsBySubscriptionKeyRef.current.get(subscriptionKey);
  if (!confirmed) {
    confirmed = new Set();
    relayConfirmedIncidentIdsBySubscriptionKeyRef.current.set(subscriptionKey, confirmed);
  }

  confirmed.add(incidentId);
}

function incidentBelongsToSubscriptionKey(
  incident: ProcessedIncident,
  subscriptionKey: string
): boolean {
  const geohash = incident.location.geohash?.toLowerCase();
  if (!geohash) {
    return false;
  }

  const cell = geohash.slice(0, MAP_SUBSCRIPTION.GEOHASH_PRECISION);
  return parseIncidentSubscriptionGroupKey(subscriptionKey).includes(cell);
}

export function pruneUnconfirmedIncidentsForSubscription({
  incidentMapRef,
  relayConfirmedIncidentIdsBySubscriptionKeyRef,
  subscriptionKey,
  cellGroupKey = subscriptionKey,
  shouldPruneIncident,
}: {
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  subscriptionKey: string;
} & PruneUnconfirmedIncidentOptions): string[] {
  const confirmedIncidentIds =
    relayConfirmedIncidentIdsBySubscriptionKeyRef.current.get(subscriptionKey) ?? new Set();
  const removedIncidentIds: string[] = [];
  const deleteTargets: IncidentCacheDeleteTarget[] = [];
  let nextIncidentMap: Map<string, ProcessedIncident> | null = null;

  for (const [incidentId, incident] of incidentMapRef.current.entries()) {
    if (!incidentBelongsToSubscriptionKey(incident, cellGroupKey)) {
      continue;
    }

    if (shouldPruneIncident && !shouldPruneIncident(incident)) {
      continue;
    }

    if (confirmedIncidentIds.has(incidentId)) {
      continue;
    }

    if (!nextIncidentMap) {
      nextIncidentMap = new Map(incidentMapRef.current);
    }
    nextIncidentMap.delete(incidentId);
    removedIncidentIds.push(incidentId);
    deleteTargets.push({
      incidentId,
      pubkey: incident.pubkey,
      eventId: incident.eventId,
    });
  }

  if (!nextIncidentMap) {
    return [];
  }

  incidentMapRef.current = nextIncidentMap;
  deleteIncidentEventsFromNdkCache(deleteTargets);
  return removedIncidentIds;
}
