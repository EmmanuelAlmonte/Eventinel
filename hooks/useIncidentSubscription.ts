/**
 * Public incident subscription hook surface.
 *
 * Runtime internals live under hooks/incidentSubscription.
 */

export { useIncidentSubscription } from './incidentSubscription/useIncidentSubscriptionCore';
export type {
  ProcessedIncident,
  UseIncidentSubscriptionOptions,
  UseIncidentSubscriptionResult,
} from './incidentSubscription/types';
export { toProcessedIncident } from './incidentSubscription/sorting';
