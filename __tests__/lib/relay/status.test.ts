/**
 * Unit Tests for lib/relay/status.ts
 *
 * Tests getStatusString, isConnected, isConnecting, getStatusColor,
 * relayToInfo, and sortRelays functions.
 */

import {
  getStatusString,
  isConnected,
  isConnecting,
  getStatusColor,
  relayToInfo,
  sortRelays,
} from '../../../lib/relay/status';

import type { RelayStatusString, RelayInfo } from '../../../types/relay';

// Mock NDKRelayStatus enum values as per documentation
// NDK uses these numeric values:
// 0: DISCONNECTING, 1: DISCONNECTED, 2: RECONNECTING, 3: FLAPPING,
// 4: CONNECTING, 5: CONNECTED, 6: AUTH_REQUESTED, 7: AUTHENTICATING, 8: AUTHENTICATED

const NDKRelayStatus = {
  DISCONNECTING: 0,
  DISCONNECTED: 1,
  RECONNECTING: 2,
  FLAPPING: 3,
  CONNECTING: 4,
  CONNECTED: 5,
  AUTH_REQUESTED: 6,
  AUTHENTICATING: 7,
  AUTHENTICATED: 8,
};

// =============================================================================
// getStatusString Tests
// =============================================================================

describe('getStatusString', () => {
  describe('connected states', () => {
    it('returns "connected" for CONNECTED (5)', () => {
      expect(getStatusString(NDKRelayStatus.CONNECTED)).toBe('connected');
    });

    it('returns "authenticating" for AUTH_REQUESTED (6)', () => {
      expect(getStatusString(NDKRelayStatus.AUTH_REQUESTED)).toBe('authenticating');
    });

    it('returns "authenticating" for AUTHENTICATING (7)', () => {
      expect(getStatusString(NDKRelayStatus.AUTHENTICATING)).toBe('authenticating');
    });

    it('returns "authenticated" for AUTHENTICATED (8)', () => {
      expect(getStatusString(NDKRelayStatus.AUTHENTICATED)).toBe('authenticated');
    });
  });

  describe('connecting states', () => {
    it('returns "connecting" for CONNECTING (4)', () => {
      expect(getStatusString(NDKRelayStatus.CONNECTING)).toBe('connecting');
    });

    it('returns "reconnecting" for RECONNECTING (2)', () => {
      expect(getStatusString(NDKRelayStatus.RECONNECTING)).toBe('reconnecting');
    });
  });

  describe('error and disconnected states', () => {
    it('returns "error" for FLAPPING (3)', () => {
      expect(getStatusString(NDKRelayStatus.FLAPPING)).toBe('error');
    });

    it('returns "disconnected" for DISCONNECTED (1)', () => {
      expect(getStatusString(NDKRelayStatus.DISCONNECTED)).toBe('disconnected');
    });

    it('returns "disconnected" for DISCONNECTING (0)', () => {
      expect(getStatusString(NDKRelayStatus.DISCONNECTING)).toBe('disconnected');
    });
  });

  describe('edge cases', () => {
    it('returns "disconnected" for negative values', () => {
      expect(getStatusString(-1)).toBe('disconnected');
      expect(getStatusString(-100)).toBe('disconnected');
    });

    it('returns "disconnected" for unknown positive values', () => {
      // Values > 8 are undefined in the enum
      expect(getStatusString(9)).toBe('disconnected');
      expect(getStatusString(100)).toBe('disconnected');
    });

    it('handles NaN by returning "disconnected"', () => {
      expect(getStatusString(NaN)).toBe('disconnected');
    });
  });
});

// =============================================================================
// isConnected Tests
// =============================================================================

describe('isConnected', () => {
  describe('returns true for connected states (>= 5)', () => {
    it('returns true for CONNECTED (5)', () => {
      expect(isConnected(NDKRelayStatus.CONNECTED)).toBe(true);
    });

    it('returns true for AUTH_REQUESTED (6)', () => {
      expect(isConnected(NDKRelayStatus.AUTH_REQUESTED)).toBe(true);
    });

    it('returns true for AUTHENTICATING (7)', () => {
      expect(isConnected(NDKRelayStatus.AUTHENTICATING)).toBe(true);
    });

    it('returns true for AUTHENTICATED (8)', () => {
      expect(isConnected(NDKRelayStatus.AUTHENTICATED)).toBe(true);
    });
  });

  describe('returns false for non-connected states (< 5)', () => {
    it('returns false for DISCONNECTING (0)', () => {
      expect(isConnected(NDKRelayStatus.DISCONNECTING)).toBe(false);
    });

    it('returns false for DISCONNECTED (1)', () => {
      expect(isConnected(NDKRelayStatus.DISCONNECTED)).toBe(false);
    });

    it('returns false for RECONNECTING (2)', () => {
      expect(isConnected(NDKRelayStatus.RECONNECTING)).toBe(false);
    });

    it('returns false for FLAPPING (3)', () => {
      expect(isConnected(NDKRelayStatus.FLAPPING)).toBe(false);
    });

    it('returns false for CONNECTING (4)', () => {
      expect(isConnected(NDKRelayStatus.CONNECTING)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for negative values', () => {
      expect(isConnected(-1)).toBe(false);
    });

    it('returns true for values > 8 (threshold is >= 5)', () => {
      expect(isConnected(9)).toBe(true);
      expect(isConnected(100)).toBe(true);
    });

    it('handles NaN by returning false', () => {
      // NaN >= 5 is false
      expect(isConnected(NaN)).toBe(false);
    });
  });
});

// =============================================================================
// isConnecting Tests
// =============================================================================

describe('isConnecting', () => {
  describe('returns true for connecting states', () => {
    it('returns true for CONNECTING (4)', () => {
      expect(isConnecting(NDKRelayStatus.CONNECTING)).toBe(true);
    });

    it('returns true for RECONNECTING (2)', () => {
      expect(isConnecting(NDKRelayStatus.RECONNECTING)).toBe(true);
    });
  });

  describe('returns false for non-connecting states', () => {
    it('returns false for DISCONNECTING (0)', () => {
      expect(isConnecting(NDKRelayStatus.DISCONNECTING)).toBe(false);
    });

    it('returns false for DISCONNECTED (1)', () => {
      expect(isConnecting(NDKRelayStatus.DISCONNECTED)).toBe(false);
    });

    it('returns false for FLAPPING (3)', () => {
      expect(isConnecting(NDKRelayStatus.FLAPPING)).toBe(false);
    });

    it('returns false for CONNECTED (5)', () => {
      expect(isConnecting(NDKRelayStatus.CONNECTED)).toBe(false);
    });

    it('returns false for AUTH_REQUESTED (6)', () => {
      expect(isConnecting(NDKRelayStatus.AUTH_REQUESTED)).toBe(false);
    });

    it('returns false for AUTHENTICATING (7)', () => {
      expect(isConnecting(NDKRelayStatus.AUTHENTICATING)).toBe(false);
    });

    it('returns false for AUTHENTICATED (8)', () => {
      expect(isConnecting(NDKRelayStatus.AUTHENTICATED)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for negative values', () => {
      expect(isConnecting(-1)).toBe(false);
    });

    it('returns false for values > 8', () => {
      expect(isConnecting(9)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isConnecting(NaN)).toBe(false);
    });
  });
});

// =============================================================================
// getStatusColor Tests
// =============================================================================

describe('getStatusColor', () => {
  describe('green colors for connected states', () => {
    it('returns green for "connected"', () => {
      expect(getStatusColor('connected')).toBe('#10b981');
    });

    it('returns green for "authenticated"', () => {
      expect(getStatusColor('authenticated')).toBe('#10b981');
    });
  });

  describe('amber colors for connecting states', () => {
    it('returns amber for "connecting"', () => {
      expect(getStatusColor('connecting')).toBe('#f59e0b');
    });

    it('returns amber for "reconnecting"', () => {
      expect(getStatusColor('reconnecting')).toBe('#f59e0b');
    });

    it('returns amber for "authenticating"', () => {
      expect(getStatusColor('authenticating')).toBe('#f59e0b');
    });
  });

  describe('red color for error state', () => {
    it('returns red for "error"', () => {
      expect(getStatusColor('error')).toBe('#ef4444');
    });
  });

  describe('gray color for disconnected state', () => {
    it('returns gray for "disconnected"', () => {
      expect(getStatusColor('disconnected')).toBe('#6b7280');
    });
  });

  describe('default case', () => {
    it('returns gray for unknown status', () => {
      // TypeScript would normally prevent this, but test runtime behavior
      expect(getStatusColor('unknown' as RelayStatusString)).toBe('#6b7280');
    });
  });
});

// =============================================================================
// relayToInfo Tests
// =============================================================================

describe('relayToInfo', () => {
  // Create mock NDKRelay objects
  const createMockRelay = (url: string, status: number) => ({
    url,
    status,
    // Other NDKRelay properties would be here
  });

  it('converts connected relay to RelayInfo', () => {
    const relay = createMockRelay('wss://relay.example.com', NDKRelayStatus.CONNECTED);

    const info = relayToInfo(relay as any);

    expect(info.url).toBe('wss://relay.example.com');
    expect(info.status).toBe('connected');
    expect(info.rawStatus).toBe(NDKRelayStatus.CONNECTED);
    expect(info.isConnected).toBe(true);
  });

  it('converts disconnected relay to RelayInfo', () => {
    const relay = createMockRelay('wss://relay.example.com', NDKRelayStatus.DISCONNECTED);

    const info = relayToInfo(relay as any);

    expect(info.url).toBe('wss://relay.example.com');
    expect(info.status).toBe('disconnected');
    expect(info.rawStatus).toBe(NDKRelayStatus.DISCONNECTED);
    expect(info.isConnected).toBe(false);
  });

  it('converts connecting relay to RelayInfo', () => {
    const relay = createMockRelay('wss://relay.example.com', NDKRelayStatus.CONNECTING);

    const info = relayToInfo(relay as any);

    expect(info.status).toBe('connecting');
    expect(info.isConnected).toBe(false);
  });

  it('converts authenticated relay to RelayInfo', () => {
    const relay = createMockRelay('wss://relay.example.com', NDKRelayStatus.AUTHENTICATED);

    const info = relayToInfo(relay as any);

    expect(info.status).toBe('authenticated');
    expect(info.isConnected).toBe(true);
  });

  it('converts flapping relay to RelayInfo with error status', () => {
    const relay = createMockRelay('wss://relay.example.com', NDKRelayStatus.FLAPPING);

    const info = relayToInfo(relay as any);

    expect(info.status).toBe('error');
    expect(info.isConnected).toBe(false);
  });

  it('preserves URL exactly as provided', () => {
    const relay = createMockRelay('ws://10.0.0.197:8085/', NDKRelayStatus.CONNECTED);

    const info = relayToInfo(relay as any);

    expect(info.url).toBe('ws://10.0.0.197:8085/');
  });
});

// =============================================================================
// sortRelays Tests
// =============================================================================

describe('sortRelays', () => {
  const createRelayInfo = (url: string, isConnected: boolean): RelayInfo => ({
    url,
    status: isConnected ? 'connected' : 'disconnected',
    rawStatus: isConnected ? NDKRelayStatus.CONNECTED : NDKRelayStatus.DISCONNECTED,
    isConnected,
  });

  it('sorts connected relays before disconnected', () => {
    const relays = [
      createRelayInfo('wss://disconnected.com', false),
      createRelayInfo('wss://connected.com', true),
    ];

    const sorted = sortRelays(relays);

    expect(sorted[0].url).toBe('wss://connected.com');
    expect(sorted[1].url).toBe('wss://disconnected.com');
  });

  it('sorts alphabetically within same connection status', () => {
    const relays = [
      createRelayInfo('wss://zebra.com', true),
      createRelayInfo('wss://alpha.com', true),
      createRelayInfo('wss://middle.com', true),
    ];

    const sorted = sortRelays(relays);

    expect(sorted[0].url).toBe('wss://alpha.com');
    expect(sorted[1].url).toBe('wss://middle.com');
    expect(sorted[2].url).toBe('wss://zebra.com');
  });

  it('combines connection priority with alphabetical sort', () => {
    const relays = [
      createRelayInfo('wss://zebra-disconnected.com', false),
      createRelayInfo('wss://alpha-connected.com', true),
      createRelayInfo('wss://alpha-disconnected.com', false),
      createRelayInfo('wss://zebra-connected.com', true),
    ];

    const sorted = sortRelays(relays);

    // Connected first, alphabetically
    expect(sorted[0].url).toBe('wss://alpha-connected.com');
    expect(sorted[1].url).toBe('wss://zebra-connected.com');
    // Then disconnected, alphabetically
    expect(sorted[2].url).toBe('wss://alpha-disconnected.com');
    expect(sorted[3].url).toBe('wss://zebra-disconnected.com');
  });

  it('does not mutate original array', () => {
    const relays = [
      createRelayInfo('wss://b.com', false),
      createRelayInfo('wss://a.com', true),
    ];

    const original = [...relays];
    sortRelays(relays);

    expect(relays).toEqual(original);
  });

  it('handles empty array', () => {
    const sorted = sortRelays([]);
    expect(sorted).toEqual([]);
  });

  it('handles single element', () => {
    const relays = [createRelayInfo('wss://only.com', true)];
    const sorted = sortRelays(relays);

    expect(sorted.length).toBe(1);
    expect(sorted[0].url).toBe('wss://only.com');
  });

  it('handles all connected relays', () => {
    const relays = [
      createRelayInfo('wss://c.com', true),
      createRelayInfo('wss://a.com', true),
      createRelayInfo('wss://b.com', true),
    ];

    const sorted = sortRelays(relays);

    expect(sorted[0].url).toBe('wss://a.com');
    expect(sorted[1].url).toBe('wss://b.com');
    expect(sorted[2].url).toBe('wss://c.com');
  });

  it('handles all disconnected relays', () => {
    const relays = [
      createRelayInfo('wss://c.com', false),
      createRelayInfo('wss://a.com', false),
      createRelayInfo('wss://b.com', false),
    ];

    const sorted = sortRelays(relays);

    expect(sorted[0].url).toBe('wss://a.com');
    expect(sorted[1].url).toBe('wss://b.com');
    expect(sorted[2].url).toBe('wss://c.com');
  });

  it('handles URLs with different protocols', () => {
    const relays = [
      createRelayInfo('wss://secure.com', true),
      createRelayInfo('ws://insecure.com', true),
    ];

    const sorted = sortRelays(relays);

    // ws:// comes before wss:// alphabetically
    expect(sorted[0].url).toBe('ws://insecure.com');
    expect(sorted[1].url).toBe('wss://secure.com');
  });

  it('handles URLs with ports', () => {
    const relays = [
      createRelayInfo('wss://relay.com:8080', true),
      createRelayInfo('wss://relay.com:443', true),
    ];

    const sorted = sortRelays(relays);

    // :443 comes before :8080 alphabetically
    expect(sorted[0].url).toBe('wss://relay.com:443');
    expect(sorted[1].url).toBe('wss://relay.com:8080');
  });
});
