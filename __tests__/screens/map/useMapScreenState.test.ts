/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { INCIDENT_LIMITS } from '../../../lib/map/constants';
import { useMapScreenState } from '../../../screens/map/useMapScreenState';

const mockNavigate = jest.fn();
const mockFocusCoordinate = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;
let mockSharedIncidentsState: {
  incidents: any[];
  hasReceivedHistory: boolean;
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
    useIsFocused: () => true,
  };
});

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#111827',
      border: '#374151',
      primary: '#2563eb',
      surface: '#1F2937',
      text: '#F9FAFB',
      textMuted: '#9CA3AF',
    },
  }),
}));

jest.mock('@contexts', () => ({
  useIncidentHistoryWindow: () => ({
    historyWindowDays: 7,
    isReady: true,
    setHistoryWindowDays: jest.fn().mockResolvedValue(undefined),
  }),
  useRelayStatus: () => ({
    hasConnectedRelay: true,
    hasRelays: true,
    isConnecting: false,
    relays: [{ url: 'wss://relay.eventinel.com' }],
  }),
  useSharedIncidents: () => ({
    incidents: mockSharedIncidentsState.incidents,
    hasReceivedHistory: mockSharedIncidentsState.hasReceivedHistory,
    setMapFocused: jest.fn(),
    setMapSubscriptionAnchor: jest.fn(),
    setMapSubscriptionViewport: jest.fn(),
  }),
  useSharedLocation: () => ({
    location: [-73.935242, 40.73061],
    isLoading: false,
    source: 'fresh',
    permission: 'granted',
    refresh: jest.fn(),
  }),
}));

jest.mock('../../../screens/map/useMapCamera', () => ({
  useMapCamera: () => ({
    mapReady: true,
    setMapReady: jest.fn(),
    cameraCenter: null,
    animationMode: 'none',
    animationDuration: 0,
    followUser: true,
    setFollowUser: jest.fn(),
    isAnimating: false,
    cameraRef: { current: null },
    shapeSourceRef: { current: null },
    lastCameraZoomRef: { current: 14 },
    clearAutoResumeTimer: jest.fn(),
    scheduleAutoResume: jest.fn(),
    focusCoordinate: mockFocusCoordinate,
    handleFlyToUser: jest.fn(),
    handleCameraChanged: jest.fn(),
  }),
}));

jest.mock('../../../screens/map/useMapViewportSubscription', () => ({
  useMapViewportSubscription: () => ({
    handleMapIdle: jest.fn(),
    isViewportCoveredBySubscriptionGrid: true,
  }),
}));

describe('useMapScreenState route focus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockSharedIncidentsState = {
      incidents: [],
      hasReceivedHistory: true,
    };
  });

  it('focuses the map camera on the incident passed through route params', async () => {
    mockRouteParams = {
      focusIncident: {
        incidentId: 'test-incident-id',
        eventId: 'test-event-id',
        title: 'Major Fire on Broadway',
        coordinate: [-73.985565, 40.756795],
        requestedAt: 1,
      },
    };

    renderHook(() => useMapScreenState());

    await waitFor(() => {
      expect(mockFocusCoordinate).toHaveBeenCalledWith([-73.985565, 40.756795]);
    });
  });

  it('does not focus the camera again when the same focus request re-renders', async () => {
    mockRouteParams = {
      focusIncident: {
        incidentId: 'test-incident-id',
        eventId: 'test-event-id',
        title: 'Major Fire on Broadway',
        coordinate: [-73.985565, 40.756795],
        requestedAt: 1,
      },
    };

    const { rerender } = renderHook(() => useMapScreenState());

    await waitFor(() => {
      expect(mockFocusCoordinate).toHaveBeenCalledTimes(1);
    });

    rerender({});

    expect(mockFocusCoordinate).toHaveBeenCalledTimes(1);
  });

  it('focuses the camera again for a new focus request', async () => {
    mockRouteParams = {
      focusIncident: {
        incidentId: 'test-incident-id',
        eventId: 'test-event-id',
        title: 'Major Fire on Broadway',
        coordinate: [-73.985565, 40.756795],
        requestedAt: 1,
      },
    };

    const { rerender } = renderHook(() => useMapScreenState());

    await waitFor(() => {
      expect(mockFocusCoordinate).toHaveBeenCalledTimes(1);
    });

    mockRouteParams = {
      focusIncident: {
        incidentId: 'test-incident-id',
        eventId: 'test-event-id',
        title: 'Major Fire on Broadway',
        coordinate: [-73.984, 40.758],
        requestedAt: 2,
      },
    };

    rerender({});

    await waitFor(() => {
      expect(mockFocusCoordinate).toHaveBeenCalledTimes(2);
    });
    expect(mockFocusCoordinate).toHaveBeenLastCalledWith([-73.984, 40.758]);
  });

  it('caps map feature rendering while initial incident history is loading', () => {
    mockSharedIncidentsState = {
      hasReceivedHistory: false,
      incidents: Array.from(
        { length: INCIDENT_LIMITS.COLD_START_MAP_FEATURE_LIMIT + 25 },
        (_, index) => ({
          incidentId: `incident-${index}`,
          location: {
            lat: 40 + index * 0.001,
            lng: -75 - index * 0.001,
          },
          severity: 3,
          type: 'disturbance',
        })
      ),
    };

    const { result } = renderHook(() => useMapScreenState());

    expect(result.current.visibleIncidents).toHaveLength(
      INCIDENT_LIMITS.COLD_START_MAP_FEATURE_LIMIT + 25
    );
    expect(result.current.incidentFeatureCollection.features).toHaveLength(
      INCIDENT_LIMITS.COLD_START_MAP_FEATURE_LIMIT
    );
  });

  it('renders the full map feature set after initial incident history completes', () => {
    mockSharedIncidentsState = {
      hasReceivedHistory: true,
      incidents: Array.from(
        { length: INCIDENT_LIMITS.COLD_START_MAP_FEATURE_LIMIT + 25 },
        (_, index) => ({
          incidentId: `incident-${index}`,
          location: {
            lat: 40 + index * 0.001,
            lng: -75 - index * 0.001,
          },
          severity: 3,
          type: 'disturbance',
        })
      ),
    };

    const { result } = renderHook(() => useMapScreenState());

    expect(result.current.incidentFeatureCollection.features).toHaveLength(
      INCIDENT_LIMITS.COLD_START_MAP_FEATURE_LIMIT + 25
    );
  });
});
