import { normalizeRelayUrl } from '@lib/relay/config';
import type { RelayInfo } from '../../types/relay';

export function getStatusColor(status: string, colors: { success: string; warning: string; error: string; textMuted: string }): string {
  switch (status.toLowerCase()) {
    case 'connected':
      return colors.success;
    case 'connecting':
      return colors.warning;
    case 'disconnected':
    case 'disconnecting':
      return colors.error;
    default:
      return colors.textMuted;
  }
}

export function normalizeUrl(url: string): string {
  return normalizeRelayUrl(url);
}

export function areRelayInfosEqual(a: RelayInfo[], b: RelayInfo[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.url !== right.url ||
      left.status !== right.status ||
      left.rawStatus !== right.rawStatus ||
      left.isConnected !== right.isConnected
    ) {
      return false;
    }
  }

  return true;
}

export function formatRelayList(relayUrls: string[]): string {
  if (relayUrls.length === 0) return 'relays';
  const cleaned = relayUrls.map((relay) => relay.replace(/^wss?:\/\//, ''));
  if (cleaned.length <= 2) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, 2).join(', ')} +${cleaned.length - 2} more`;
}
