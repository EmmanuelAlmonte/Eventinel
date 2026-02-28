/**
 * Hooks Module
 *
 * Re-exports all custom React hooks.
 */

export { useUserLocation } from './useUserLocation';
export type { UseUserLocationOptions, UseUserLocationResult } from './useUserLocation';

export { useIncidentSubscription } from './useIncidentSubscription';
export type {
  UseIncidentSubscriptionOptions,
  UseIncidentSubscriptionResult,
  ProcessedIncident,
} from './useIncidentSubscription';

export { useIncidentComments } from './useIncidentComments';
export type {
  CommentDeletionNotice,
  IncidentComment,
  UseIncidentCommentsResult,
} from './useIncidentComments';

export { useAppTheme } from './useAppTheme';
