import React from 'react';
import { render, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useIsFocused: () => true,
}));

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

const mockLocation = [-73.935242, 40.730610];

const createLocationState = (overrides = {}) => ({
  location: mockLocation,
  permission: 'granted',
  source: 'fresh',
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  ...overrides,
});

const mockUseSharedLocation = jest.fn(() => createLocationState());

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

const mockSetFeedFocused = jest.fn();

const buildSharedIncidentsState = (overrides = {}) => ({
  incidents: mockIncidents,
  hasReceivedHistory: true,
  setFeedFocused: mockSetFeedFocused,
  ...overrides,
});

const mockUseSharedIncidents = jest.fn(() => buildSharedIncidentsState());

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

jest.mock('@components/ui', () => ({
  ScreenContainer: ({ children }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'screen-container' }, children);
  },
  LocationRequiredEmpty: ({ onRetry }: any) => {
    const React = require('react');
    const { View, Text, Pressable } = require('react-native');
    return React.createElement(
      View,
      { testID: 'location-required' },
      React.createElement(Text, null, 'Location Required'),
      React.createElement(Pressable, { onPress: onRetry }, React.createElement(Text, null, 'Retry'))
    );
  },
  SkeletonList: ({ count }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'skeleton-list' },
      React.createElement(Text, null, `Loading ${count} items...`)
    );
  },
  EmptyState: ({ title }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'empty-state' },
      React.createElement(Text, null, title)
    );
  },
  NoRelaysEmpty: ({ onAddRelay }: any) => {
    const React = require('react');
    const { View, Text, Pressable } = require('react-native');
    return React.createElement(
      View,
      { testID: 'no-relays-empty' },
      React.createElement(Text, null, 'No Relays Connected'),
      React.createElement(
        Pressable,
        { onPress: onAddRelay },
        React.createElement(Text, null, 'Add Relay')
      )
    );
  },
}));

jest.mock('@lib/nostr/config', () => ({
  SEVERITY_COLORS: {
    1: '#22c55e',
    2: '#84cc16',
    3: '#eab308',
    4: '#f97316',
    5: '#ef4444',
  },
  TYPE_CONFIG: {
    fire: { icon: 'local-fire-department', color: '#ef4444', label: 'Fire' },
    traffic: { icon: 'traffic', color: '#f97316', label: 'Traffic' },
    medical: { icon: 'medical-services', color: '#ec4899', label: 'Medical' },
    crime: { icon: 'report', color: '#8b5cf6', label: 'Crime' },
    weather: { icon: 'thunderstorm', color: '#3b82f6', label: 'Weather' },
    other: { icon: 'warning', color: '#6b7280', label: 'Other' },
  },
}));

jest.mock('@lib/utils/time', () => ({
  formatRelativeTimeMs: (ms: number) => {
    const diffMs = Date.now() - ms;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  },
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, numberOfLines, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(
      Text,
      {
        style,
        numberOfLines,
        ...props,
      },
      children
    );
  },
  Button: ({ title, onPress }: any) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { onPress },
      React.createElement(Text, null, title)
    );
  },
  Card: ({ children, containerStyle }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { style: containerStyle }, children);
  },
  Icon: ({ name }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: `icon-${name}` }, name);
  },
  Badge: ({ value, badgeStyle, textStyle }: any) => {
    const React = require('react');
    const { Text, View } = require('react-native');
    return React.createElement(
      View,
      { style: badgeStyle },
      React.createElement(Text, { style: textStyle }, value)
    );
  },
}));

import IncidentFeedScreen from '../../screens/IncidentFeedScreen';

const FOCUS_LIST_ACTIVATION_DELAY_MS = 250;

const activateFocusedIncidentList = () => {
  act(() => {
    jest.advanceTimersByTime(FOCUS_LIST_ACTIVATION_DELAY_MS);
  });
};

const renderActiveIncidentFeed = () => {
  const result = render(<IncidentFeedScreen />);
  activateFocusedIncidentList();
  return result;
};

const renderInactiveIncidentFeed = () => render(<IncidentFeedScreen />);

const resetIncidentFeedScreenTestHarness = () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockUseSharedLocation.mockReturnValue(createLocationState());
  mockUseSharedIncidents.mockReturnValue(buildSharedIncidentsState());
  mockUseRelayStatus.mockReturnValue({
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
  });
};

const cleanupIncidentFeedScreenTestHarness = () => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
};

export {
  activateFocusedIncidentList,
  buildSharedIncidentsState,
  cleanupIncidentFeedScreenTestHarness,
  createLocationState,
  mockColors,
  mockIncidents,
  mockLocation,
  mockNavigate,
  mockSetFeedFocused,
  mockUseRelayStatus,
  mockUseSharedIncidents,
  mockUseSharedLocation,
  renderActiveIncidentFeed,
  renderInactiveIncidentFeed,
  resetIncidentFeedScreenTestHarness,
};
