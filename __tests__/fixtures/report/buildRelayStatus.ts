import type { useRelayStatus } from '../../../contexts';
import type { RelayInfo } from '../../../types/relay';

type RelayStatusFixture = ReturnType<typeof useRelayStatus>;

export function buildRelayInfo(overrides: Partial<RelayInfo> = {}): RelayInfo {
  return {
    url: 'ws://10.0.2.2:8085',
    status: 'connected',
    rawStatus: 5,
    isConnected: true,
    ...overrides,
  };
}

export function buildRelayStatus(overrides: Partial<RelayStatusFixture> = {}): RelayStatusFixture {
  const relays = overrides.relays ?? [];
  const connected = overrides.stats?.connected ?? relays.filter((relay) => relay.isConnected).length;
  const connecting = overrides.stats?.connecting ?? relays.filter((relay) => relay.status === 'connecting').length;
  const total = overrides.stats?.total ?? relays.length;
  const disconnected = overrides.stats?.disconnected ?? Math.max(total - connected - connecting, 0);

  return {
    relays,
    stats: {
      total,
      connected,
      connecting,
      disconnected,
      ...overrides.stats,
    },
    hasConnectedRelay: overrides.hasConnectedRelay ?? connected > 0,
    hasRelays: overrides.hasRelays ?? total > 0,
    isConnecting: overrides.isConnecting ?? connecting > 0,
  };
}
