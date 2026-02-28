/**
 * Unit Tests for lib/relay/config.ts
 */

type RelayConfigModule = typeof import('../../../lib/relay/config');

function loadRelayConfig(options: {
  isDev: boolean;
  expoPublicRelays?: string;
  nextPublicRelays?: string;
}): RelayConfigModule {
  const previousDev = (global as any).__DEV__;
  const previousExpoPublicRelays = process.env.EXPO_PUBLIC_NOSTR_RELAYS;
  const previousNextPublicRelays = process.env.NEXT_PUBLIC_NOSTR_RELAYS;

  (global as any).__DEV__ = options.isDev;

  if (options.expoPublicRelays == null) {
    delete process.env.EXPO_PUBLIC_NOSTR_RELAYS;
  } else {
    process.env.EXPO_PUBLIC_NOSTR_RELAYS = options.expoPublicRelays;
  }

  if (options.nextPublicRelays == null) {
    delete process.env.NEXT_PUBLIC_NOSTR_RELAYS;
  } else {
    process.env.NEXT_PUBLIC_NOSTR_RELAYS = options.nextPublicRelays;
  }

  let moduleRef: RelayConfigModule | null = null;
  jest.isolateModules(() => {
    moduleRef = require('../../../lib/relay/config') as RelayConfigModule;
  });

  (global as any).__DEV__ = previousDev;

  if (previousExpoPublicRelays == null) {
    delete process.env.EXPO_PUBLIC_NOSTR_RELAYS;
  } else {
    process.env.EXPO_PUBLIC_NOSTR_RELAYS = previousExpoPublicRelays;
  }

  if (previousNextPublicRelays == null) {
    delete process.env.NEXT_PUBLIC_NOSTR_RELAYS;
  } else {
    process.env.NEXT_PUBLIC_NOSTR_RELAYS = previousNextPublicRelays;
  }

  if (!moduleRef) {
    throw new Error('Failed to load relay config module');
  }

  return moduleRef;
}

describe('lib/relay/config', () => {
  it('pins DEFAULT_RELAYS to production in release builds', () => {
    const config = loadRelayConfig({
      isDev: false,
      expoPublicRelays: 'ws://10.0.2.2:8085,wss://custom-relay.example.com',
      nextPublicRelays: 'wss://another-relay.example.com',
    });

    expect(config.DEFAULT_RELAYS).toEqual(['wss://relay.eventinel.com']);
  });

  it('allows env relay override in development builds', () => {
    const config = loadRelayConfig({
      isDev: true,
      expoPublicRelays: ' WSS://Relay.Eventinel.Com/ , wss://dev-relay.example.com ',
    });

    expect(config.DEFAULT_RELAYS).toEqual([
      'wss://relay.eventinel.com',
      'wss://dev-relay.example.com',
    ]);
  });

  it('falls back to production relay in development when env relay is missing', () => {
    const config = loadRelayConfig({
      isDev: true,
    });

    expect(config.DEFAULT_RELAYS).toEqual(['wss://relay.eventinel.com']);
  });
});
