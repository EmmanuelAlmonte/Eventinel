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

export { useAppTheme } from './useAppTheme';
