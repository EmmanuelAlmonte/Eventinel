import { normalizeRelayUrl } from '@lib/relay/config';
import { areRelayInfosEqual, formatRelayList } from '@lib/relay/helpers';

export function normalizeUrl(url: string): string {
  return normalizeRelayUrl(url);
}

export function getStatusColor(
  status: string,
  colors: { success: string; warning: string; error: string; textMuted: string }
): string {
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

export { areRelayInfosEqual, formatRelayList };
