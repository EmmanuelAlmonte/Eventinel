/**
 * IncidentFeedScreen Component Tests
 *
 * Tests the incident feed screen functionality including:
 * - Initial rendering and loading states
 * - Incident list display
 * - Empty state handling
 * - Incident card interactions
 * - Pull to refresh behavior
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Import the component
import IncidentFeedScreen from '../../screens/IncidentFeedScreen';
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
}));

// Mock useAppTheme
const mockColors = {
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
};

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
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
    title: 'Fire on Main Street',
    description: 'Large fire reported at 123 Main St',
    type: 'fire',
    severity: 4,
    location: { lat: 40.730610, lng: -73.935242, address: '123 Main St, New York, NY' },
    occurredAt: Math.floor(Date.now() / 1000) - 1800,
    occurredAtMs: Date.now() - 1800000,
  },
  {
    incidentId: 'incident-2',
    eventId: 'event-2',
    title: 'Traffic Accident',
    description: 'Multi-car accident blocking intersection',
    type: 'traffic',
    severity: 3,
    location: { lat: 40.731610, lng: -73.936242, address: '456 Broadway, New York, NY' },
    occurredAt: Math.floor(Date.now() / 1000) - 3600,
    occurredAtMs: Date.now() - 3600000,
  },
  {
    incidentId: 'incident-3',
    eventId: 'event-3',
    title: 'Medical Emergency',
    description: 'Person collapsed on sidewalk',
    type: 'medical',
    severity: 5,
    location: { lat: 40.732610, lng: -73.937242, address: '789 5th Ave, New York, NY' },
    occurredAt: Math.floor(Date.now() / 1000) - 7200,
    occurredAtMs: Date.now() - 7200000,
  },
];

const mockUseSharedIncidents = jest.fn(() => ({
  incidents: mockIncidents,
  hasReceivedHistory: true,
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

// Mock ScreenContainer and SkeletonList
jest.mock('@components/ui', () => ({
  ScreenContainer: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="screen-container">{children}</View>;
  },
  SkeletonList: ({ count }: { count: number }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="skeleton-list">
        <Text>Loading {count} items...</Text>
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

// Mock nostr config
jest.mock('@lib/nostr/config', () => ({
  SEVERITY_COLORS: {
    1: '#22c55e',
    2: '#84cc16',
    3: '#eab308',
    4: '#f97316',
    5: '#ef4444',
  },
  TYPE_CONFIG: {
    fire: { icon: 'local-fire-department', color: '#ef4444' },
    traffic: { icon: 'traffic', color: '#f97316' },
    medical: { icon: 'medical-services', color: '#ec4899' },
    crime: { icon: 'report', color: '#8b5cf6' },
    weather: { icon: 'thunderstorm', color: '#3b82f6' },
    other: { icon: 'warning', color: '#6b7280' },
  },
}));

// Mock time utils
jest.mock('@lib/utils/time', () => ({
  formatRelativeTimeMs: (ms: number) => {
    const now = Date.now();
    const diffMs = now - ms;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  },
}));

// Mock @rneui/themed
jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, h2, numberOfLines, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text style={style} numberOfLines={numberOfLines} {...props}>{children}</Text>;
  },
  Card: ({ children, containerStyle }: any) => {
    const { View } = require('react-native');
    return <View style={containerStyle}>{children}</View>;
  },
  Icon: ({ name, color, size, type }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
  Badge: ({ value, badgeStyle, textStyle }: any) => {
    const { Text, View } = require('react-native');
    return (
      <View style={badgeStyle}>
        <Text style={textStyle}>{value}</Text>
      </View>
    );
  },
}));

// =============================================================================
// TEST SUITE
// =============================================================================

describe('IncidentFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSharedLocation.mockReturnValue(createLocationState());
    mockUseSharedIncidents.mockReturnValue({
      incidents: mockIncidents,
      hasReceivedHistory: true,
    });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders the incidents title', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Incidents')).toBeTruthy();
    });

    it('renders subtitle with incident count', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/3 nearby/)).toBeTruthy();
    });

    it('shows Updated status when history received', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/Updated/)).toBeTruthy();
    });

    it('shows Loading status when history not received', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: mockIncidents,
        hasReceivedHistory: false,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/Loading/)).toBeTruthy();
    });

    it('renders screen container', () => {
      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('screen-container')).toBeTruthy();
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('shows skeleton list when location is loading', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: true, source: 'none', permission: 'undetermined' })
      );

      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('skeleton-list')).toBeTruthy();
    });

    it('shows finding location message during loading', () => {
      mockUseSharedLocation.mockReturnValue(
        createLocationState({ location: null, isLoading: true, source: 'none', permission: 'undetermined' })
      );

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Finding your location...')).toBeTruthy();
    });

    it('does not show skeleton when location is ready', () => {
      const { queryByTestId } = render(<IncidentFeedScreen />);
      expect(queryByTestId('skeleton-list')).toBeNull();
    });
  });

  // =============================================================================
  // INCIDENT LIST TESTS
  // =============================================================================

  describe('Incident List', () => {
    it('renders all incident cards', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Fire on Main Street')).toBeTruthy();
      expect(getByText('Traffic Accident')).toBeTruthy();
      expect(getByText('Medical Emergency')).toBeTruthy();
    });

    it('displays incident descriptions', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/Large fire reported/)).toBeTruthy();
      expect(getByText(/Multi-car accident/)).toBeTruthy();
    });

    it('displays incident addresses', () => {
      const { getAllByText } = render(<IncidentFeedScreen />);
      expect(getAllByText(/123 Main St/).length).toBeGreaterThan(0);
      expect(getAllByText(/456 Broadway/).length).toBeGreaterThan(0);
    });

    it('displays severity badges', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Sev 4')).toBeTruthy();
      expect(getByText('Sev 3')).toBeTruthy();
      expect(getByText('Sev 5')).toBeTruthy();
    });

    it('displays relative timestamps', () => {
      const { getAllByText } = render(<IncidentFeedScreen />);
      expect(getAllByText(/ago/).length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // INCIDENT CARD INTERACTION TESTS
  // =============================================================================

  describe('Incident Card Interactions', () => {
    it('navigates to incident detail when card is pressed', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      const fireIncident = getByText('Fire on Main Street');

      fireEvent.press(fireIncident);

      expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
        incidentId: 'incident-1',
      });
    });

    it('navigates with correct incident id for second item', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      const trafficIncident = getByText('Traffic Accident');

      fireEvent.press(trafficIncident);

      expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
        incidentId: 'incident-2',
      });
    });

    it('navigates with correct incident id for third item', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      const medicalIncident = getByText('Medical Emergency');

      fireEvent.press(medicalIncident);

      expect(mockNavigate).toHaveBeenCalledWith('IncidentDetail', {
        incidentId: 'incident-3',
      });
    });
  });

  // =============================================================================
  // EMPTY STATE TESTS
  // =============================================================================

  describe('Empty State', () => {
    it('shows All Clear message when no incidents and history received', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: true,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('All Clear')).toBeTruthy();
    });

    it('shows no incidents message in empty state', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: true,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('No incidents reported in your area')).toBeTruthy();
    });

    it('shows check-circle icon in empty state', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: true,
      });

      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('icon-check-circle')).toBeTruthy();
    });

    it('shows loading state when no incidents and history not received', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: false,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Loading...')).toBeTruthy();
      expect(getByText('Fetching incidents from relays')).toBeTruthy();
    });

    it('shows hourglass icon during loading empty state', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: false,
      });

      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('icon-hourglass-empty')).toBeTruthy();
    });
  });

  // =============================================================================
  // INCIDENT TYPE ICON TESTS
  // =============================================================================

  describe('Incident Type Icons', () => {
    it('shows fire icon for fire incidents', () => {
      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('icon-local-fire-department')).toBeTruthy();
    });

    it('shows traffic icon for traffic incidents', () => {
      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('icon-traffic')).toBeTruthy();
    });

    it('shows medical icon for medical incidents', () => {
      const { getByTestId } = render(<IncidentFeedScreen />);
      expect(getByTestId('icon-medical-services')).toBeTruthy();
    });
  });

  // =============================================================================
  // SUBTITLE COUNT TESTS
  // =============================================================================

  describe('Subtitle Counts', () => {
    it('shows correct count with multiple incidents', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/3 nearby/)).toBeTruthy();
    });

    it('shows 0 nearby when no incidents', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [],
        hasReceivedHistory: true,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/0 nearby/)).toBeTruthy();
    });

    it('shows 1 nearby with single incident', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [mockIncidents[0]],
        hasReceivedHistory: true,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText(/1 nearby/)).toBeTruthy();
    });
  });

  // =============================================================================
  // META ICONS TESTS
  // =============================================================================

  describe('Meta Information Icons', () => {
    it('shows schedule icon for time', () => {
      const { getAllByTestId } = render(<IncidentFeedScreen />);
      const scheduleIcons = getAllByTestId('icon-schedule');
      expect(scheduleIcons.length).toBeGreaterThan(0);
    });

    it('shows location icon for address', () => {
      const { getAllByTestId } = render(<IncidentFeedScreen />);
      const locationIcons = getAllByTestId('icon-location-on');
      expect(locationIcons.length).toBeGreaterThan(0);
    });

    it('shows chevron for navigation', () => {
      const { getAllByTestId } = render(<IncidentFeedScreen />);
      const chevrons = getAllByTestId('icon-chevron-right');
      expect(chevrons.length).toBe(3);
    });
  });

  // =============================================================================
  // DIFFERENT SEVERITY HANDLING
  // =============================================================================

  describe('Severity Handling', () => {
    it('handles severity 1 incidents', () => {
      mockUseSharedIncidents.mockReturnValue({
        incidents: [{
          ...mockIncidents[0],
          severity: 1,
        }],
        hasReceivedHistory: true,
      });

      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Sev 1')).toBeTruthy();
    });

    it('handles maximum severity 5 incidents', () => {
      const { getByText } = render(<IncidentFeedScreen />);
      expect(getByText('Sev 5')).toBeTruthy();
    });
  });
});
