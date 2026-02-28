import type { ProcessedIncident } from '@hooks';
import type { Severity } from '@lib/nostr/config';
import type { MapSubscriptionViewport } from '@lib/map/subscriptionPlanner';

export interface IncidentSubscriptionContextValue {
  incidents: ProcessedIncident[];
  isInitialLoading: boolean;
  hasReceivedHistory: boolean;
  severityCounts: Record<Severity, number>;
  setMapFocused: (focused: boolean) => void;
  setMapSubscriptionAnchor: (anchor: [number, number] | null) => void;
  setMapSubscriptionViewport: (viewport: MapSubscriptionViewport | null) => void;
  setFeedFocused: (focused: boolean) => void;
}
