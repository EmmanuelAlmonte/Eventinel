/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import ReportIncidentReviewScreen from '../../screens/ReportIncidentReviewScreen';

const mockDraft = {
  sourceTab: 'Map',
  location: {
    latitude: 40.03836,
    longitude: -75.05134,
  },
  incidentType: 'fire',
  description: 'LOCAL RELAY QA 1776709409 smoke from rowhome on alley side',
  locationNote: 'LOCAL RELAY QA 1776709409',
  stillActive: true,
};

const mockUseRelayStatus = jest.fn<any, []>(() => ({
  relays: [],
  stats: {
    total: 0,
    connected: 0,
    connecting: 0,
    disconnected: 0,
  },
  hasConnectedRelay: false,
  hasRelays: false,
  isConnecting: false,
}));

jest.mock('@contexts', () => ({
  useSharedLocation: () => ({
    location: [-75.05134, 40.03836],
  }),
  useRelayStatus: () => mockUseRelayStatus(),
  useReportDraft: () => ({
    draft: mockDraft,
    sessionKey: 'session-1',
    resetDraft: jest.fn(),
    setAdjustEntryMode: jest.fn(),
  }),
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textMuted: '#9CA3AF',
      primary: '#2563eb',
      success: '#22c55e',
      warning: '#f59e0b',
      border: '#374151',
    },
    isDark: true,
  }),
}));

jest.mock('@nostr-dev-kit/mobile', () => ({
  useNDK: () => ({
    ndk: {
      pool: {
        relays: new Map(),
      },
    },
  }),
  useNDKCurrentPubkey: () => 'pubkey-123',
}));

jest.mock('@components/ui', () => ({
  showToast: {
    error: jest.fn(),
  },
}));

jest.mock('@lib/nostr/events/incident', () => ({
  createIncidentEvent: jest.fn(),
}));

jest.mock('@lib/utils/reportLocationRadius', () => ({
  getReportRadiusState: () => ({
    isWithinRadius: true,
    message: 'Within half a mile of your current location.',
  }),
}));

jest.mock('./../../screens/reportIncident/locationPresentation', () => ({
  buildLocationPresentation: () => ({
    title: '3100 block Princeton Avenue',
    subtitle: 'Philadelphia, Pennsylvania',
    tertiary: 'LOCAL RELAY QA 1776709409',
  }),
  useResolvedReportLocation: () => ({
    resolvedPlaceLabel: '3100 block Princeton Avenue',
    resolvedContextLine: 'Philadelphia, Pennsylvania',
  }),
}));

jest.mock('./../../screens/reportIncident/ReportLocationPreview', () => ({
  ReportLocationPreview: () => {
    const { View, Text } = require('react-native');
    return (
      <View>
        <Text>Preview</Text>
      </View>
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

function buildProps() {
  return {
    navigation: {
      replace: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      popToTop: jest.fn(),
    },
    route: {
      key: 'ReportIncidentReview-key',
      name: 'ReportIncidentReview',
      params: {
        sessionKey: 'session-1',
      },
    },
  } as any;
}

describe('ReportIncidentReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the no-relay footer state when nothing is connected', () => {
    mockUseRelayStatus.mockReturnValue({
      relays: [],
      stats: {
        total: 1,
        connected: 0,
        connecting: 1,
        disconnected: 0,
      },
      hasConnectedRelay: false,
      hasRelays: true,
      isConnecting: true,
    });

    const screen = render(<ReportIncidentReviewScreen {...buildProps()} />);

    expect(screen.getByText('Connect a relay to submit. Back to map is available after send.')).toBeTruthy();
  });

  it('uses live relay status to enable the ready-to-publish state', () => {
    mockUseRelayStatus.mockReturnValue({
      relays: [
        {
          url: 'ws://10.0.2.2:8085',
          status: 'connected',
          rawStatus: 5,
          isConnected: true,
        },
      ] as any[],
      stats: {
        total: 1,
        connected: 1,
        connecting: 0,
        disconnected: 0,
      },
      hasConnectedRelay: true,
      hasRelays: true,
      isConnecting: false,
    });

    const screen = render(<ReportIncidentReviewScreen {...buildProps()} />);

    expect(screen.getByText('Ready to publish to 1 connected relay.')).toBeTruthy();
    expect(screen.getByLabelText('Submit report').props.accessibilityState?.disabled).not.toBe(true);
  });
});
