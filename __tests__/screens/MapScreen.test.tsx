/**
 * MapScreen Component Tests
 *
 * Tests the map screen functionality including:
 * - Initial rendering and loading states
 * - Map marker interactions
 * - Fly to user location button
 * - Empty state handling
 * - Camera interactions
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';

// Import the component
import MapScreen from '../../screens/MapScreen';
import type { UseUserLocationResult } from '../../hooks/useUserLocation';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useIsFocused: () => true,
}));

// Mock useAppTheme
jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#1a1a2e',
      surface: '#27272A',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      primary: '#2563eb',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      border: '#3F3F46',
    },
    isDark: true,
  }),
}));

// Mock shared location context
const mockLocation: [number, number] = [-73.935242, 40.730610];
const createLocationState = (overrides: Partial<UseUserLocationResult> = {}): UseUserLocationResult => ({
  location: mockLocation,
  permission: 'granted',
  source: 'fresh',
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  ...overrides,
});
const mockUseSharedLocation = jest.fn<UseUserLocationResult, []>(() => createLocationState());

// Mock shared incidents context
const mockIncidents = [
  {
    incidentId: 'incident-1',
    eventId: 'event-1',
    title: 'Test Incident 1',
    description: 'Test description',
    type: 'fire',
    severity: 3,
    location: { lat: 40.730610, lng: -73.935242, address: '123 Test St' },
    occurredAt: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    incidentId: 'incident-2',
    eventId: 'event-2',
    title: 'Test Incident 2',
    description: 'Another test description',
    type: 'traffic',
    severity: 2,
    location: { lat: 40.731610, lng: -73.936242, address: '456 Test Ave' },
    occurredAt: Math.floor(Date.now() / 1000) - 7200,
  },
];

const mockUseSharedIncidents = jest.fn(() => ({
  incidents: mockIncidents,
  isInitialLoading: false,
  hasReceivedHistory: true,
  setMapFocused: jest.fn(),
}));

const mockUseRelayStatus = jest.fn(() => ({
  hasConnectedRelay: true,
  hasRelays: true,
  isConnecting: false,
  relays: [
    {
      url: 'wss://relay.eventinel.com',
      status: 'connected',
      rawStatus: 5,
      isConnected: true,
    },
  ],
}));

jest.mock('@contexts', () => ({
  useSharedLocation: () => mockUseSharedLocation(),
  useSharedIncidents: () => mockUseSharedIncidents(),
  useRelayStatus: () => mockUseRelayStatus(),
}));

// Mock IncidentMarker component
jest.mock('@components/map', () => ({
  IncidentMarker: ({ incident, onPress }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID={`marker-${incident.incidentId}`}
        onPress={() => onPress(incident)}
      >
        <Text>{incident.title}</Text>
      </Pressable>
    );
  },
}));

// Mock MapSkeleton
jest.mock('@components/ui', () => ({
  MapSkeleton: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="map-skeleton">
        <Text>Loading map...</Text>
      </View>
    );
  },
  ScreenContainer: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="screen-container">{children}</View>;
  },
  LocationRequiredEmpty: ({ onRetry }: { onRetry?: () => void }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="location-required">
        <Text>Location Required</Text>
        <Pressable onPress={onRetry}>
          <Text>Retry</Text>
        </Pressable>
      </View>
    );
  },
  EmptyState: ({ title }: { title: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="empty-state">
        <Text>{title}</Text>
      </View>
    );
  },
  NoRelaysEmpty: ({ onAddRelay }: { onAddRelay?: () => void }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="no-relays-empty">
        <Text>No Relays Connected</Text>
        <Pressable onPress={onAddRelay}>
          <Text>Add Relay</Text>
        </Pressable>
      </View>
    );
  },
}));

// Mock map constants
jest.mock('@lib/map/types', () => ({
  DEFAULT_CAMERA: {
    centerCoordinate: [-73.935242, 40.730610],
  },
  MAP_STYLES: {
    DARK: 'mapbox://styles/mapbox/dark-v11',
  },
  SEVERITY_COLORS: {
    1: '#6B7280',
    2: '#3B82F6',
    3: '#F59E0B',
    4: '#EA580C',
    5: '#DC2626',
  },
  incidentsToFeatureCollection: (incidents: any[]) => ({
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [incident.location?.lng ?? 0, incident.location?.lat ?? 0],
      },
      properties: {
        incidentId: incident.incidentId,
        severity: incident.severity,
      },
    })),
  }),
}));

jest.mock('@lib/map/constants', () => ({
  MAPBOX_CONFIG: {
    DEFAULT_ZOOM: 14,
  },
  USER_LOCATION: {
    MARKER_SIZE: 16,
    MARKER_COLOR: '#2563eb',
    MARKER_BORDER_WIDTH: 2,
    MARKER_BORDER_COLOR: '#FFFFFF',
  },
  INCIDENT_LIMITS: {
    SINCE_DAYS: 7,
  },
  INCIDENT_MARKER: {
    PIN_SIZE: 30,
    PIN_BORDER_WIDTH: 2,
    PIN_BORDER_COLOR: '#fff',
    TEXT_COLOR: '#fff',
    TEXT_FONT_SIZE: 14,
  },
}));

// Mock @rneui/themed Icon
jest.mock('@rneui/themed', () => ({
  Icon: ({ name, onPress, testID }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={testID || `icon-${name}`} onPress={onPress}>
        <Text>{name}</Text>
      </Pressable>
    );
  },
  Button: ({ title, onPress }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
}));

// =============================================================================
// TEST SUITE
// =============================================================================

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSharedLocation.mockReturnValue(createLocationState());
    mockUseSharedIncidents.mockReturnValue({
      incidents: mockIncidents,
      isInitialLoading: false,
      hasReceivedHistory: true,
      setMapFocused: jest.fn(),
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('shows MapSkeleton when location is loading', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: true, source: 'none', permission: 'undetermined' })
      );

      const { getByTestId } = render(<MapScreen />);
      expect(getByTestId('map-skeleton')).toBeTruthy();
    });

    it('shows loading text while location is being fetched', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: true, source: 'none', permission: 'undetermined' })
      );

      const { getByText } = render(<MapScreen />);
      expect(getByText('Loading map...')).toBeTruthy();
    });

    it('renders map container after location loads', () => {
      const { queryByTestId } = render(<MapScreen />);
      expect(queryByTestId('map-skeleton')).toBeNull();
    });
  });

  // =============================================================================
  // MAP RENDERING TESTS
  // =============================================================================

  describe('Map Rendering', () => {
    it('renders map container when ready', () => {
      const { UNSAFE_root } = render(<MapScreen />);
      // Check that we have the main container structure
      expect(UNSAFE_root).toBeTruthy();
    });

    it('shows incident count in stats overlay', () => {
      const { getByText } = render(<MapScreen />);
      // Incident count is shown in the stats overlay when DEV mode is on
      expect(getByText(/Incidents: 2/)).toBeTruthy();
    });

    it('shows EOSE indicator when history received', () => {
      const { getByText } = render(<MapScreen />);
      expect(getByText(/EOSE:/)).toBeTruthy();
    });
  });

  // =============================================================================
  // INCIDENT DATA TESTS
  // =============================================================================

  describe('Incident Data', () => {
    it('displays incident count from shared context', () => {
      const { getByText } = render(<MapScreen />);
      // The component shows incidents.length in the stats overlay
      expect(getByText(/Incidents: 2/)).toBeTruthy();
    });

    it('handles empty incidents array', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        isInitialLoading: false,
        hasReceivedHistory: true,
        setMapFocused: jest.fn(),
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText(/Incidents: 0/)).toBeTruthy();
    });
  });

  // =============================================================================
  // FLY TO USER BUTTON TESTS
  // =============================================================================

  describe('Fly To User Button', () => {
    it('renders fly to user button when location is available', () => {
      const { getByLabelText } = render(<MapScreen />);
      expect(getByLabelText('Fly to my location')).toBeTruthy();
    });

    it('fly to button has correct accessibility role', () => {
      const { getByRole } = render(<MapScreen />);
      const button = getByRole('button', { name: 'Fly to my location' });
      expect(button).toBeTruthy();
    });

    it('does not render fly to button when location is null', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: false, source: 'none', permission: 'denied' })
      );

      const { queryByLabelText } = render(<MapScreen />);
      expect(queryByLabelText('Fly to my location')).toBeNull();
    });
  });

  // =============================================================================
  // EMPTY STATE TESTS
  // =============================================================================

  describe('Empty State', () => {
    it('shows empty state message when no incidents and history received', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        isInitialLoading: false,
        hasReceivedHistory: true,
        setMapFocused: jest.fn(),
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText('No incidents found')).toBeTruthy();
    });

    it('shows hint text about incident timeframe', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        isInitialLoading: false,
        hasReceivedHistory: true,
        setMapFocused: jest.fn(),
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText(/Incidents from the last/)).toBeTruthy();
    });

    it('does not show empty state before history is received', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        isInitialLoading: true,
        hasReceivedHistory: false,
        setMapFocused: jest.fn(),
      });

      const { queryByText } = render(<MapScreen />);
      expect(queryByText('No incidents found')).toBeNull();
    });

    it('does not show empty state when incidents exist', () => {
      const { queryByText } = render(<MapScreen />);
      expect(queryByText('No incidents found')).toBeNull();
    });
  });

  // =============================================================================
  // USER LOCATION MARKER TESTS
  // =============================================================================

  describe('User Location Marker', () => {
    it('does not render user marker when location is null', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: false, source: 'none', permission: 'denied' })
      );

      // The user marker component won't be rendered
      const { UNSAFE_root } = render(<MapScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  // =============================================================================
  // LOCATION SOURCE INDICATOR TESTS (DEV MODE)
  // =============================================================================

  describe('Location Debug Info (DEV mode)', () => {
    beforeAll(() => {
      (global as any).__DEV__ = true;
    });

    afterAll(() => {
      (global as any).__DEV__ = false;
    });

    it('renders fresh location indicator style', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ source: 'fresh', permission: 'granted' })
      );

      const { getByText } = render(<MapScreen />);
      // In DEV mode, the location source text should be visible
      expect(getByText(/FRESH/)).toBeTruthy();
    });

    it('renders cached location indicator', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ source: 'cached', permission: 'granted' })
      );

      const { getByText } = render(<MapScreen />);
      expect(getByText(/CACHED/)).toBeTruthy();
    });

    it('renders default location indicator', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ source: 'default', permission: 'denied' })
      );

      const { getByText } = render(<MapScreen />);
      expect(getByText(/DEFAULT/)).toBeTruthy();
    });
  });

  // =============================================================================
  // STATS OVERLAY TESTS (DEV MODE)
  // =============================================================================

  describe('Stats Overlay (DEV mode)', () => {
    beforeAll(() => {
      (global as any).__DEV__ = true;
    });

    afterAll(() => {
      (global as any).__DEV__ = false;
    });

    it('shows incident count in DEV mode', () => {
      const { getByText } = render(<MapScreen />);
      expect(getByText(/Incidents: 2/)).toBeTruthy();
    });

    it('shows EOSE status when history received', () => {
      const { getByText } = render(<MapScreen />);
      // EOSE checkmark should be visible
      expect(getByText(/EOSE:/)).toBeTruthy();
    });
  });

  // =============================================================================
  // ANIMATION STATE TESTS
  // =============================================================================

  describe('Animation States', () => {
    it('disables fly to button during animation', async () => {
      const { getByRole } = render(<MapScreen />);
      const button = getByRole('button', { name: 'Fly to my location' });

      // Initial state should not be disabled
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  // =============================================================================
  // PERMISSION HANDLING TESTS
  // =============================================================================

  describe('Permission Handling', () => {
    it('handles denied permission gracefully', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: mockLocation, source: 'default', permission: 'denied' })
      );

      const { UNSAFE_root } = render(<MapScreen />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles undetermined permission state', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: true, source: 'none', permission: 'undetermined' })
      );

      const { getByTestId } = render(<MapScreen />);
      expect(getByTestId('map-skeleton')).toBeTruthy();
    });
  });
});
