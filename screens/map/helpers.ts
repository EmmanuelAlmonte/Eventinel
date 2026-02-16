import type { LngLat } from '@lib/map/geohashViewport';

const MAX_RELAY_LABELS = 2;

type MapProperties = {
  zoom?: number;
  zoomLevel?: number;
  camera?: {
    zoom?: number;
    zoomLevel?: number;
  };
};

export function extractZoomFromProperties(properties?: MapProperties): number | null {
  const zoomCandidates = [
    properties?.zoom,
    properties?.zoomLevel,
    properties?.camera?.zoom,
    properties?.camera?.zoomLevel,
  ];

  for (const candidate of zoomCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isLngLat(value: unknown): value is LngLat {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  return Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

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

type RelayStatusInput = {
  hasConnectedRelay: boolean;
  hasRelays: boolean;
  isConnecting: boolean;
  relayLabel: string;
};

export type RelayBannerStatus = {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
} | null;

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
