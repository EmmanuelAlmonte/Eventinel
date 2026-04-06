import { normalizeRelayUrl } from '@lib/relay/config';
import { DEFAULT_RELAYS } from '@lib/relay/storage';
import type { RelayInfo, RelayStatusString } from '../../types/relay';
import { areRelayInfosEqual, formatRelayList } from '@lib/relay/helpers';

export function normalizeUrl(url: string): string {
  return normalizeRelayUrl(url);
}

export function getRelayThemeStatusColor(
  status: RelayStatusString,
  colors: { success: string; warning: string; error: string; textMuted: string }
): string {
  switch (status) {
    case 'connected':
    case 'authenticated':
      return colors.success;
    case 'connecting':
    case 'reconnecting':
    case 'authenticating':
      return colors.warning;
    case 'error':
      return colors.error;
    case 'disconnected':
    default:
      return colors.textMuted;
  }
}

export function getRelayPrimaryStatusLabel(status: RelayStatusString): string {
  switch (status) {
    case 'authenticated':
    case 'authenticating':
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'reconnecting':
      return 'Reconnecting';
    case 'error':
    case 'disconnected':
    default:
      return 'Disconnected';
  }
}

export function getRelaySecondaryStatusLabel(status: RelayStatusString): string | null {
  switch (status) {
    case 'authenticated':
      return 'Authenticated';
    case 'authenticating':
      return 'Requires auth';
    case 'error':
      return 'Needs attention';
    default:
      return null;
  }
}

export function shouldShowRetryAction(status: RelayStatusString): boolean {
  return status === 'disconnected' || status === 'error';
}

export function getRelayKindLabel(url: string): string {
  return DEFAULT_RELAYS.includes(normalizeUrl(url)) ? 'Default relay' : 'Custom relay';
}

export function getRelayHealthMeta(relays: RelayInfo[]): {
  label: string;
  tone: 'success' | 'warning' | 'error';
} {
  if (relays.length === 0) {
    return { label: 'Needs setup', tone: 'error' };
  }

  const hasProblems = relays.some((relay) => relay.status === 'error' || relay.status === 'disconnected');
  const hasInFlight = relays.some(
    (relay) =>
      relay.status === 'connecting' ||
      relay.status === 'reconnecting' ||
      relay.status === 'authenticating'
  );

  if (hasProblems) {
    return { label: 'Needs attention', tone: 'error' };
  }

  if (hasInFlight) {
    return { label: 'Syncing', tone: 'warning' };
  }

  return { label: 'Healthy', tone: 'success' };
}

export { areRelayInfosEqual, formatRelayList };
