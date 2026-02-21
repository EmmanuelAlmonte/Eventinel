import type { RelayInfo } from '../../types/relay';

export const MAX_RELAY_LABELS = 2;

export type RelayBannerStatus = {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
} | null;

type RelayStatusInput = {
  hasConnectedRelay: boolean;
  hasRelays: boolean;
  isConnecting: boolean;
  relayLabel: string;
};

export function formatRelayList(relayUrls: string[]): string {
  if (!relayUrls || relayUrls.length === 0) return 'relays';

  const cleaned = relayUrls
    .map((relay) => relay.replace(/^wss?:\/\//, ''))
    .filter((relay) => relay.length > 0);

  if (cleaned.length <= MAX_RELAY_LABELS) {
    return cleaned.join(', ');
  }

  return `${cleaned.slice(0, MAX_RELAY_LABELS).join(', ')} +${cleaned.length - MAX_RELAY_LABELS} more`;
}

export function buildRelayBannerStatus({
  hasConnectedRelay,
  hasRelays,
  isConnecting,
  relayLabel,
}: RelayStatusInput): RelayBannerStatus {
  if (hasConnectedRelay) return null;

  return {
    icon: !hasRelays ? 'cloud-off' : isConnecting ? 'wifi' : 'wifi-off',
    title: !hasRelays
      ? 'No Relays Connected'
      : isConnecting
        ? 'Connecting to relays'
        : 'Relays disconnected',
    description: !hasRelays
      ? 'Add a Nostr relay to start receiving incident updates.'
      : isConnecting
        ? `Waiting for ${relayLabel} to connect.`
        : `Unable to reach ${relayLabel}. Check your connection or relay settings.`,
    actionLabel: !hasRelays ? 'Add Relay' : 'Relay Settings',
  };
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
