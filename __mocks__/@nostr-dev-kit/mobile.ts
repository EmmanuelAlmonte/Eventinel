/**
 * Comprehensive Mock for @nostr-dev-kit/mobile
 *
 * This mock provides controllable implementations of all NDK hooks
 * used in the authentication system. Tests can override these mocks
 * to simulate different auth states and scenarios.
 *
 * Usage in tests:
 *   import { mockNDKHooks } from '../__mocks__/@nostr-dev-kit/mobile';
 *   mockNDKHooks.setCurrentUser({ pubkey: 'abc123' });
 */

// =============================================================================
// MOCK STATE MANAGEMENT
// =============================================================================

interface MockUser {
  pubkey: string;
  profile?: {
    displayName?: string;
    name?: string;
    about?: string;
    picture?: string;
  };
}

interface MockSignerApp {
  packageName: string;
  name?: string;
}

const createMockNDK = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  addExplicitRelay: jest.fn(),
  fetchEvents: jest.fn().mockResolvedValue(new Set()),
  pool: {
    on: jest.fn(),
    off: jest.fn(),
    relays: new Map(),
    removeRelay: jest.fn(),
  },
});

// Central mock state - can be modified by tests
const mockState = {
  currentUser: null as MockUser | null,
  currentPubkey: null as string | null,
  ndk: createMockNDK(),
  nip55: {
    isAvailable: true,
    apps: [
      { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
    ] as MockSignerApp[],
  },
};

// Helper to update mock state from tests
export const mockNDKHooks = {
  setCurrentUser: (user: MockUser | null) => {
    mockState.currentUser = user;
    mockState.currentPubkey = user?.pubkey || null;
  },
  getNDK: () => mockState.ndk,
  setCurrentPubkey: (pubkey: string | null) => {
    mockState.currentPubkey = pubkey;
  },
  setNip55Available: (available: boolean) => {
    mockState.nip55.isAvailable = available;
  },
  setNip55Apps: (apps: MockSignerApp[]) => {
    mockState.nip55.apps = apps;
  },
  reset: () => {
    mockState.currentUser = null;
    mockState.currentPubkey = null;
    mockState.nip55.isAvailable = true;
    mockState.nip55.apps = [
      { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
    ];
    mockState.ndk = createMockNDK();
  },
};

// =============================================================================
// MOCK HOOKS
// =============================================================================

/**
 * Mock useNDK hook
 * Returns the mock NDK instance
 */
export const useNDK = jest.fn(() => ({
  ndk: mockState.ndk,
}));

/**
 * Mock useNDKCurrentUser hook
 * Returns the current authenticated user or null
 */
export const useNDKCurrentUser = jest.fn(() => mockState.currentUser);

/**
 * Mock useNDKCurrentPubkey hook
 * Returns the current user's pubkey or null
 */
export const useNDKCurrentPubkey = jest.fn(() => mockState.currentPubkey);

/**
 * Mock useNDKSessionLogin hook
 * Returns a login function that can be tracked in tests
 */
export const useNDKSessionLogin = jest.fn(() => {
  const loginFn = jest.fn().mockImplementation(async (signer, persist) => {
    // Simulate successful login by setting the user
    const user = await signer.user();
    mockState.currentUser = user;
    mockState.currentPubkey = user?.pubkey;
    return user;
  });
  return loginFn;
});

/**
 * Mock useNDKSessionLogout hook
 * Returns a logout function that clears the current user
 */
export const useNDKSessionLogout = jest.fn(() => {
  const logoutFn = jest.fn().mockImplementation(async (pubkey) => {
    if (pubkey === mockState.currentPubkey) {
      mockState.currentUser = null;
      mockState.currentPubkey = null;
    }
  });
  return logoutFn;
});

/**
 * Mock useNDKInit hook
 * Returns initializer that stores the provided ndk instance
 */
export const useNDKInit = jest.fn(() => {
  return (ndkInstance?: any) => {
    if (ndkInstance) {
      mockState.ndk = ndkInstance;
    }
  };
});

/**
 * Mock useNip55 hook (Android signer detection)
 * Returns availability status and list of signer apps
 */
export const useNip55 = jest.fn(() => ({
  isAvailable: mockState.nip55.isAvailable,
  apps: mockState.nip55.apps,
}));

/**
 * Mock useSessionMonitor hook
 * Used for automatic session persistence
 */
export const useSessionMonitor = jest.fn(() => {
  // No-op in tests - session monitoring handled differently
});

/**
 * Mock useNDKStore hook (Zustand store)
 */
export const useNDKStore = jest.fn((selector) => {
  const store = {
    ndk: mockState.ndk,
    setNDK: jest.fn(),
  };
  return selector ? selector(store) : store;
});

// =============================================================================
// MOCK SIGNER CLASSES
// =============================================================================

/**
 * Mock NDKPrivateKeySigner
 * Simulates private key signer creation
 */
export class NDKPrivateKeySigner {
  private key: string;
  private mockPubkey: string;

  constructor(privateKey: string) {
    this.key = privateKey;

    // Validate key format (basic check)
    if (!privateKey || privateKey.length < 32) {
      throw new Error('Invalid private key');
    }

    // Generate a deterministic mock pubkey from the key
    this.mockPubkey = 'pubkey_' + privateKey.slice(0, 16);
  }

  async user() {
    return {
      pubkey: this.mockPubkey,
      profile: {
        displayName: 'Private Key User',
        name: 'pk_user',
      },
    };
  }

  async sign(event: any) {
    return { ...event, sig: 'mock_signature_' + Date.now() };
  }

  async blockUntilReady() {
    return this;
  }

  get nsec() {
    return this.key;
  }

  get npub() {
    return `npub_${this.mockPubkey}`;
  }

  static generate() {
    return new NDKPrivateKeySigner(`nsec1${'a'.repeat(60)}`);
  }
}

/**
 * Mock NDKNip55Signer
 * Simulates Android signer app interaction
 */
export class NDKNip55Signer {
  private packageName: string;
  private isReady: boolean = false;
  private shouldFail: boolean = false;

  constructor(packageName: string) {
    this.packageName = packageName;

    // Check if this package is in our mock available apps
    const available = mockState.nip55.apps.some(
      (app) => app.packageName === packageName
    );
    if (!available) {
      this.shouldFail = true;
    }
  }

  async blockUntilReady() {
    if (this.shouldFail) {
      throw new Error(`Signer app ${this.packageName} not available`);
    }
    // Simulate async delay for signer readiness
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.isReady = true;
    return this;
  }

  async user() {
    if (!this.isReady) {
      throw new Error('Signer not ready - call blockUntilReady first');
    }
    return {
      pubkey: 'nip55_pubkey_' + this.packageName.slice(-8),
      profile: {
        displayName: 'NIP-55 User',
        name: 'nip55_user',
      },
    };
  }

  async sign(event: any) {
    if (!this.isReady) {
      throw new Error('Signer not ready');
    }
    return { ...event, sig: 'nip55_signature_' + Date.now() };
  }
}

/**
 * Mock NDKNip46Signer
 * Simulates remote signer connection (bunker, NIP-05, nostrconnect)
 */
export class NDKNip46Signer {
  private ndk: any;
  private connectionToken?: string;
  private flow: 'bunker' | 'nip05' | 'nostrconnect';
  private isReady: boolean = false;
  private shouldFail: boolean = false;
  public nostrConnectUri?: string;
  public rpc = { encryptionType: 'nip44' as 'nip04' | 'nip44' };
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  constructor(ndk: any, userOrConnectionToken?: string, flow: 'auto' | 'nostrconnect' = 'auto') {
    this.ndk = ndk;
    this.connectionToken = userOrConnectionToken;

    if (flow === 'nostrconnect') {
      this.flow = 'nostrconnect';
      const relay = userOrConnectionToken || 'wss://relay.mock';
      this.nostrConnectUri = `nostrconnect://mock?relay=${encodeURIComponent(relay)}`;
      return;
    }

    if (!userOrConnectionToken) {
      this.flow = 'bunker';
      this.shouldFail = true;
      return;
    }

    if (userOrConnectionToken.startsWith('bunker://')) {
      this.flow = 'bunker';
    } else if (userOrConnectionToken.includes('@')) {
      this.flow = 'nip05';
    } else {
      this.flow = 'bunker';
      this.shouldFail = true;
    }
  }

  static bunker(ndk: any, userOrConnectionToken?: string, localSigner?: any) {
    return new NDKNip46Signer(ndk, userOrConnectionToken);
  }

  static nostrconnect(
    ndk: any,
    relay: string,
    localSigner?: any,
    options?: any
  ) {
    return new NDKNip46Signer(ndk, relay, 'nostrconnect');
  }

  on(event: string, handler: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((fn) => fn !== handler);
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.listeners[event] || [];
    handlers.forEach((handler) => handler(...args));
  }

  async blockUntilReady() {
    if (this.shouldFail) {
      throw new Error('Invalid bunker URL format');
    }

    // Simulate network delay for bunker connection
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate connection failure for specific test URLs
    if (this.connectionToken && this.connectionToken.includes('fail')) {
      throw new Error('Bunker connection failed');
    }

    this.isReady = true;
    return this;
  }

  async user() {
    if (!this.isReady) {
      throw new Error('Bunker not ready - call blockUntilReady first');
    }

    let pubkey = 'bunker_pubkey_mock';
    let displayName = 'Bunker User';
    let name = 'bunker_user';

    if (this.flow === 'bunker' && this.connectionToken) {
      const match = this.connectionToken.match(/bunker:\/\/([a-f0-9]+)/);
      pubkey = match ? match[1] : 'bunker_pubkey_mock';
    } else if (this.flow === 'nip05' && this.connectionToken) {
      pubkey = `nip05_${this.connectionToken.replace('@', '_')}`;
      displayName = 'NIP-05 User';
      name = 'nip05_user';
    } else if (this.flow === 'nostrconnect') {
      pubkey = 'nostrconnect_pubkey_mock';
      displayName = 'Nostr Connect User';
      name = 'nostrconnect_user';
    }

    return {
      pubkey,
      profile: {
        displayName,
        name,
      },
    };
  }

  async sign(event: any) {
    if (!this.isReady) {
      throw new Error('Bunker not ready');
    }
    return { ...event, sig: 'nip46_signature_' + Date.now() };
  }
}

// =============================================================================
// MOCK NDK CLASS
// =============================================================================

/**
 * Mock NDK class
 */
class NDK {
  explicitRelayUrls: string[];
  cacheAdapter: any;
  pool: any;

  constructor(options: any = {}) {
    this.explicitRelayUrls = options.explicitRelayUrls || [];
    this.cacheAdapter = options.cacheAdapter;
    this.pool = {
      on: jest.fn(),
      off: jest.fn(),
      relays: new Map(),
      removeRelay: jest.fn(),
    };
  }

  async connect() {
    return Promise.resolve();
  }

  addExplicitRelay(url: string) {
    this.explicitRelayUrls.push(url);
  }

  async fetchEvents() {
    return new Set();
  }
}

export default NDK;

// =============================================================================
// MOCK CACHE ADAPTER
// =============================================================================

export class NDKCacheAdapterSqlite {
  private dbName: string;
  ndk: any;
  db: {
    getFirstSync: jest.Mock;
    getAllSync: jest.Mock;
    runSync: jest.Mock;
  };

  constructor(dbName: string) {
    this.dbName = dbName;
    this.db = {
      getFirstSync: jest.fn().mockReturnValue({ count: 0 }),
      getAllSync: jest.fn().mockReturnValue([]),
      runSync: jest.fn(),
    };
  }

  initialize() {
    // No-op in tests
  }

  query(subscription: any): any[] {
    // Return empty array by default - tests can override
    return [];
  }

  setEvent(event: any) {
    // No-op in tests
  }

  getEvent(id: string): any | null {
    return null;
  }
}

// =============================================================================
// MOCK SUBSCRIPTION STATE (for useSubscribe)
// =============================================================================

interface MockSubscriptionState {
  events: any[];
  eose: boolean;
}

const subscriptionState: MockSubscriptionState = {
  events: [],
  eose: false,
};

/**
 * Helper to control useSubscribe mock state from tests
 */
export const mockSubscription = {
  setEvents: (events: any[]) => {
    subscriptionState.events = events;
  },
  setEose: (eose: boolean) => {
    subscriptionState.eose = eose;
  },
  addEvent: (event: any) => {
    subscriptionState.events.push(event);
  },
  reset: () => {
    subscriptionState.events = [];
    subscriptionState.eose = false;
  },
};

/**
 * Mock useSubscribe hook
 * Returns events and eose state that can be controlled by tests
 */
export const useSubscribe = jest.fn((filters: any[] | false, options?: any) => {
  // Return empty if filters is false (disabled)
  if (filters === false) {
    return { events: [], eose: false };
  }
  return {
    events: subscriptionState.events,
    eose: subscriptionState.eose,
  };
});

// =============================================================================
// MOCK NDK EVENT CLASS
// =============================================================================

/**
 * Mock NDKEvent class for creating/publishing events
 */
export class NDKEvent {
  ndk: any;
  id: string;
  pubkey: string;
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  sig?: string;
  relay?: any;
  onRelays?: any[];

  constructor(ndk?: any, rawEvent?: any) {
    this.ndk = ndk;
    this.id = rawEvent?.id || 'mock_event_id_' + Math.random().toString(36).slice(2);
    this.pubkey = rawEvent?.pubkey || 'mock_pubkey';
    this.kind = rawEvent?.kind || 1;
    this.content = rawEvent?.content || '';
    this.tags = rawEvent?.tags || [];
    this.created_at = rawEvent?.created_at || Math.floor(Date.now() / 1000);
    this.sig = rawEvent?.sig;
  }

  async publish() {
    return Promise.resolve();
  }

  async sign() {
    this.sig = 'mock_signature_' + Date.now();
    return Promise.resolve();
  }

  tagValue(tagName: string): string | undefined {
    const tag = this.tags.find((t) => t[0] === tagName);
    return tag?.[1];
  }
}

// =============================================================================
// MOCK NDK SUBSCRIPTION CACHE USAGE ENUM
// =============================================================================

export const NDKSubscriptionCacheUsage = {
  CACHE_FIRST: 'CACHE_FIRST',
  ONLY_CACHE: 'ONLY_CACHE',
  ONLY_RELAY: 'ONLY_RELAY',
  PARALLEL: 'PARALLEL',
} as const;

// =============================================================================
// MOCK NDK RELAY STATUS ENUM
// =============================================================================

/**
 * NDKRelayStatus enum - mirrors the actual NDK values
 * 0: DISCONNECTING, 1: DISCONNECTED, 2: RECONNECTING, 3: FLAPPING,
 * 4: CONNECTING, 5: CONNECTED, 6: AUTH_REQUESTED, 7: AUTHENTICATING, 8: AUTHENTICATED
 */
export const NDKRelayStatus = {
  DISCONNECTING: 0,
  DISCONNECTED: 1,
  RECONNECTING: 2,
  FLAPPING: 3,
  CONNECTING: 4,
  CONNECTED: 5,
  AUTH_REQUESTED: 6,
  AUTHENTICATING: 7,
  AUTHENTICATED: 8,
} as const;

// =============================================================================
// MOCK NDK FILTER TYPE
// =============================================================================

export interface NDKFilter {
  kinds?: number[];
  authors?: string[];
  ids?: string[];
  '#e'?: string[];
  '#p'?: string[];
  '#a'?: string[];
  '#g'?: string[];
  '#t'?: string[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: any;
}

// =============================================================================
// RE-EXPORT FOR COMPATIBILITY
// =============================================================================

export { NDK };
