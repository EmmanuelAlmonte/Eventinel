import type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/mobile';
import type { ParsedIncident } from '@lib/nostr/events/types';
import type { Severity } from '@lib/nostr/config';
import type { MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

export const INCIDENT_KIND = 30911 as const;
export const SUBSCRIPTION_BUFFER_MS = 100;
export const EARTH_RADIUS_METERS = 6371000;

export interface QueuedEvent {
  event: NDKEvent;
  source: IncomingEventSource;
}

export type IncomingEventSource = 'cache' | 'relay';

export interface SubscriptionLifecycle {
  start: (key: string, subscription: NDKSubscription) => void;
  stop: (key: string) => void;
  stopAll: () => void;
  setHasReceivedHistory: (key: string) => void;
  clear: () => void;
  subscriptions: Map<string, NDKSubscription>;
  eoseBySubscriptionKey: Map<string, boolean>;
}

export interface ProcessedIncidentSortInput {
  incidentMap: Map<string, ProcessedIncident>;
  location: [number, number] | null;
  maxIncidents: number;
}

export interface UseIncidentSubscriptionOptions {
  /** User location used for display ordering (nearest first). */
  location: [number, number] | null;
  /** Optional location used only for geohash subscription filtering. */
  subscriptionLocation?: [number, number] | null;
  /** Optional viewport used for subscription planning. */
  subscriptionViewport?: MapSubscriptionViewport | null;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Maximum incidents to return */
  maxIncidents?: number;
}

export interface ProcessedIncident extends ParsedIncident {
  /** createdAt in milliseconds */
  createdAtMs: number;
  /** occurredAt in milliseconds (with fallback) */
  occurredAtMs: number;
}

export type SeverityCounts = Record<Severity, number>;

export interface UseIncidentSubscriptionResult {
  /** Parsed incidents (sorted by distance, then recency, then id, sliced to max) */
  incidents: ProcessedIncident[];
  /** True until first EOSE received */
  isInitialLoading: boolean;
  /** True after EOSE (historical events received) */
  hasReceivedHistory: boolean;
  /** Severity counts for DISPLAYED incidents (post-slice) */
  severityCounts: SeverityCounts;
  /** Incidents that were updated since last render */
  updatedIncidents: ProcessedIncident[];
  /** Total events received (for debugging) */
  totalEventsReceived: number;
  /** Timestamp of last update */
  lastUpdatedAt: number | null;
}

export interface IncidentSubscriptionDisplayState {
  incidents: ProcessedIncident[];
  severityCounts: SeverityCounts;
  updatedIncidents: ProcessedIncident[];
  totalEventsReceived: number;
  hasReceivedHistory: boolean;
}

export interface EventBatchInput {
  queuedEvents: readonly QueuedEvent[];
  incidentMap: Map<string, ProcessedIncident>;
  maxCandidateRetention: number;
  location: [number, number] | null;
}

export interface EventBatchResult {
  incidentMap: Map<string, ProcessedIncident>;
  totalRelevantEvents: number;
  cacheCount: number;
  relayCount: number;
  updatedIncidents: ProcessedIncident[];
  didUpdate: boolean;
}

export interface ReconcileInput {
  enabled: boolean;
  desiredCells: string[];
  activeSubscriptionKeys: Iterable<string>;
}

export interface ReconcileResult {
  desiredKeys: Set<string>;
  toAdd: string[];
  toRemove: string[];
  shouldPruneByCell: boolean;
}
