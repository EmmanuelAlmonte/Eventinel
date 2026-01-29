/**
 * Mock for expo-location
 *
 * Provides controllable implementations of location APIs for testing.
 * Tests can override mock state to simulate different location scenarios.
 */

// =============================================================================
// MOCK STATE
// =============================================================================

interface MockLocationState {
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  currentPosition: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  } | null;
  lastKnownPosition: {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  } | null;
  watchCallbackDelay: number;
  shouldFail: boolean;
  failMessage: string;
}

const mockState: MockLocationState = {
  permissionStatus: 'undetermined',
  currentPosition: {
    coords: {
      latitude: 39.9526,
      longitude: -75.1652,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  },
  lastKnownPosition: null,
  watchCallbackDelay: 10,
  shouldFail: false,
  failMessage: 'Location error',
};

/**
 * Helper to control expo-location mock state from tests
 */
export const mockLocation = {
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => {
    mockState.permissionStatus = status;
  },
  setCurrentPosition: (lat: number, lng: number, accuracy?: number) => {
    mockState.currentPosition = {
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy || 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
  },
  setLastKnownPosition: (lat: number, lng: number, timestamp?: number) => {
    mockState.lastKnownPosition = {
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: timestamp || Date.now() - 30000,
    };
  },
  clearLastKnownPosition: () => {
    mockState.lastKnownPosition = null;
  },
  setWatchCallbackDelay: (ms: number) => {
    mockState.watchCallbackDelay = ms;
  },
  setShouldFail: (shouldFail: boolean, message?: string) => {
    mockState.shouldFail = shouldFail;
    mockState.failMessage = message || 'Location error';
  },
  reset: () => {
    mockState.permissionStatus = 'undetermined';
    mockState.currentPosition = {
      coords: {
        latitude: 39.9526,
        longitude: -75.1652,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    mockState.lastKnownPosition = null;
    mockState.watchCallbackDelay = 10;
    mockState.shouldFail = false;
    mockState.failMessage = 'Location error';
  },
};

// =============================================================================
// ACCURACY ENUM
// =============================================================================

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
} as const;

// =============================================================================
// MOCK FUNCTIONS
// =============================================================================

export const getForegroundPermissionsAsync = jest.fn(async () => {
  return { status: mockState.permissionStatus };
});

export const requestForegroundPermissionsAsync = jest.fn(async () => {
  // Simulate permission request - in tests, typically grant
  if (mockState.permissionStatus === 'undetermined') {
    mockState.permissionStatus = 'granted';
  }
  return { status: mockState.permissionStatus };
});

export const getLastKnownPositionAsync = jest.fn(async (options?: { maxAge?: number }) => {
  if (mockState.shouldFail) {
    throw new Error(mockState.failMessage);
  }
  return mockState.lastKnownPosition;
});

export const getCurrentPositionAsync = jest.fn(async (options?: { accuracy?: number }) => {
  if (mockState.shouldFail) {
    throw new Error(mockState.failMessage);
  }
  return mockState.currentPosition;
});

// Track active watchers for cleanup
let watcherId = 0;
const activeWatchers = new Map<number, ReturnType<typeof setTimeout>>();

export interface LocationSubscription {
  remove: () => void;
}

export const watchPositionAsync = jest.fn(
  async (
    options: { accuracy?: number; distanceInterval?: number; timeInterval?: number },
    callback: (location: any) => void
  ): Promise<LocationSubscription> => {
    if (mockState.shouldFail) {
      throw new Error(mockState.failMessage);
    }

    const id = ++watcherId;

    // Simulate async location callback
    const timeoutId = setTimeout(() => {
      if (mockState.currentPosition) {
        callback(mockState.currentPosition);
      }
      activeWatchers.delete(id);
    }, mockState.watchCallbackDelay);

    activeWatchers.set(id, timeoutId);

    return {
      remove: () => {
        const timeout = activeWatchers.get(id);
        if (timeout) {
          clearTimeout(timeout);
          activeWatchers.delete(id);
        }
      },
    };
  }
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LocationObject = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

export default {
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  getLastKnownPositionAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
};
