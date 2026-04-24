/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ReportIncidentReviewScreen from '../../screens/ReportIncidentReviewScreen';
import { createIncidentEvent } from '../../lib/nostr/events/incident';
import { buildReportDraft } from '../fixtures/report/buildReportDraft';
import { buildReportLocation, buildResolvedReportLocation } from '../fixtures/report/buildReportLocation';
import { buildRelayInfo, buildRelayStatus } from '../fixtures/report/buildRelayStatus';

const defaultMockDraft = buildReportDraft();
let mockDraft = buildReportDraft();
let mockResolvedReportLocation = buildResolvedReportLocation();
const mockResetDraft = jest.fn();
const mockSetAdjustEntryMode = jest.fn();

const mockUseRelayStatus = jest.fn<any, []>(() => buildRelayStatus());

jest.mock('@contexts', () => ({
  useSharedLocation: () => ({
    location: [-75.05134, 40.03836],
  }),
  useRelayStatus: () => mockUseRelayStatus(),
  useReportDraft: () => ({
    draft: mockDraft,
    sessionKey: 'session-1',
    resetDraft: mockResetDraft,
    setAdjustEntryMode: mockSetAdjustEntryMode,
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
  useResolvedReportLocation: () => mockResolvedReportLocation,
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
      reset: jest.fn(),
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
    mockDraft = buildReportDraft(defaultMockDraft);
    mockResolvedReportLocation = buildResolvedReportLocation();
  });

  it('shows the no-relay footer state when nothing is connected', () => {
    mockUseRelayStatus.mockReturnValue(
      buildRelayStatus({
        stats: {
          total: 1,
          connected: 0,
          connecting: 1,
          disconnected: 0,
        },
        hasConnectedRelay: false,
        hasRelays: true,
        isConnecting: true,
      })
    );

    const screen = render(<ReportIncidentReviewScreen {...buildProps()} />);

    expect(screen.getByText('Connect a relay to submit. Back to map is available after send.')).toBeTruthy();
  });

  it('uses live relay status to enable the ready-to-publish state', () => {
    mockUseRelayStatus.mockReturnValue(
      buildRelayStatus({
        relays: [buildRelayInfo()],
      })
    );

    const screen = render(<ReportIncidentReviewScreen {...buildProps()} />);

    expect(screen.getByText('Ready to publish to 1 connected relay.')).toBeTruthy();
    expect(screen.getByLabelText('Submit report').props.accessibilityState?.disabled).not.toBe(true);
  });

  it('resets the report stack to main plus submitted after successful submit', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    jest.mocked(createIncidentEvent).mockReturnValue({ publish } as any);
    mockUseRelayStatus.mockReturnValue(
      buildRelayStatus({
        relays: [buildRelayInfo()],
      })
    );
    const props = buildProps();

    const screen = render(<ReportIncidentReviewScreen {...props} />);
    fireEvent.press(screen.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(publish).toHaveBeenCalledTimes(1);
    });

    expect(mockResetDraft).toHaveBeenCalledTimes(1);
    expect(props.navigation.replace).not.toHaveBeenCalled();
    expect(props.navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'Main' },
        {
          name: 'ReportIncidentSubmitted',
          params: {
            incidentType: 'fire',
            locationLabel: '3100 block Princeton Avenue',
            relayCount: 1,
            sourceTab: 'Map',
            stillActive: true,
          },
        },
      ],
    });
  });

  it('does not submit a stale resolved place label when the current location has no valid resolution yet', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    jest.mocked(createIncidentEvent).mockReturnValue({ publish } as any);
    mockResolvedReportLocation = buildResolvedReportLocation({
      resolvedPlaceLabel: null,
      resolvedContextLine: null,
      isResolvingPlace: true,
    });
    mockDraft = buildReportDraft({
      location: buildReportLocation({
        latitude: 40.04111,
        longitude: -75.06111,
      }),
      locationNote: 'Fresh user-entered landmark',
    });
    mockUseRelayStatus.mockReturnValue(
      buildRelayStatus({
        relays: [buildRelayInfo()],
      })
    );

    const screen = render(<ReportIncidentReviewScreen {...buildProps()} />);
    fireEvent.press(screen.getByLabelText('Submit report'));

    await waitFor(() => {
      expect(publish).toHaveBeenCalledTimes(1);
    });

    expect(createIncidentEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        location: {
          lat: 40.04111,
          lng: -75.06111,
          address: 'Fresh user-entered landmark',
        },
      })
    );
  });
});
