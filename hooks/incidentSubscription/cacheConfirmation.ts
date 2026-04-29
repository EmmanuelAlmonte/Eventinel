import type { MutableRefObject } from 'react';

import { MAP_SUBSCRIPTION } from '@lib/map/constants';
import { deleteIncidentEventsFromNdkCache } from '@lib/ndk';
import type { IncidentCacheDeleteTarget } from '@lib/nostr/incidentCacheMaintenance';
import type { ProcessedIncident } from './types';

export type RelayConfirmationMapRef = MutableRefObject<Map<string, Set<string>>>;

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

  return (
    geohash.slice(0, MAP_SUBSCRIPTION.GEOHASH_PRECISION) ===
    subscriptionKey.toLowerCase()
  );
}

export function pruneUnconfirmedIncidentsForSubscription({
  incidentMapRef,
  relayConfirmedIncidentIdsBySubscriptionKeyRef,
  subscriptionKey,
}: {
  incidentMapRef: MutableRefObject<Map<string, ProcessedIncident>>;
  relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef;
  subscriptionKey: string;
}): string[] {
  const confirmedIncidentIds =
    relayConfirmedIncidentIdsBySubscriptionKeyRef.current.get(subscriptionKey) ?? new Set();
  const removedIncidentIds: string[] = [];
  const deleteTargets: IncidentCacheDeleteTarget[] = [];
  let nextIncidentMap: Map<string, ProcessedIncident> | null = null;

  for (const [incidentId, incident] of incidentMapRef.current.entries()) {
    if (!incidentBelongsToSubscriptionKey(incident, subscriptionKey)) {
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
