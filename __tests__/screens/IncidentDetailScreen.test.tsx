import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Share } from 'react-native';

import IncidentDetailScreen from '../../screens/IncidentDetailScreen';
import type { ParsedIncident } from '../../lib/nostr/events/types';
import type { UseIncidentCommentsResult } from '../../hooks/useIncidentComments';

const mockGoBack = jest.fn();
const mockRouteParams = { incidentId: 'test-incident-id' };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

const mockColors = {
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  primary: '#2563eb',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  border: '#374151',
};

let mockCurrentUser: { pubkey: string; profile?: { displayName?: string } } | null = {
  pubkey: 'user-pubkey-123',
  profile: { displayName: 'Test User' },
};

jest.mock('@nostr-dev-kit/mobile', () => ({
  useNDKCurrentUser: () => mockCurrentUser,
}));

const mockUseIncidentComments = jest.fn<
  UseIncidentCommentsResult,
  [ParsedIncident | null | undefined]
>(() => ({
  comments: [],
  isLoading: false,
  isStale: false,
  retry: jest.fn(),
  postComment: jest.fn().mockResolvedValue(undefined),
  deleteComment: jest.fn().mockResolvedValue(undefined),
  recentDeletions: [],
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
  }),
  useIncidentComments: (incident?: ParsedIncident | null) => mockUseIncidentComments(incident),
}));

const mockIncident: ParsedIncident = {
  incidentId: 'test-incident-id',
  eventId: 'test-event-id',
  pubkey: 'incident-author-pubkey',
  createdAt: Math.floor(Date.now() / 1000) - 1800,
  title: 'Major Fire on Broadway',
  description: 'A large fire has broken out in a commercial building on Broadway.',
  type: 'fire',
  severity: 4,
  source: 'community',
  sourceId: 'source-1',
  isVerified: true,
  location: {
    lat: 40.756795,
    lng: -73.985565,
    address: '1500 Broadway',
    city: 'New York',
    state: 'NY',
    geohash: 'dr5r',
  },
  occurredAt: new Date(Date.now() - 1800 * 1000),
};

const mockGetIncident = jest.fn((id: string) => (id === 'test-incident-id' ? mockIncident : undefined));

jest.mock('@contexts', () => ({
  useIncidentCache: () => ({
    getIncident: mockGetIncident,
    version: 1,
  }),
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
    fire: { icon: 'local-fire-department', color: '#ef4444', gradient: ['#ef4444', '#dc2626'], glyph: '🔥' },
    other: { icon: 'warning', color: '#6b7280', gradient: ['#6b7280', '#4b5563'], glyph: '⚠️' },
  },
}));

jest.mock('@lib/utils/time', () => ({
  formatRelativeTime: () => '30 minutes ago',
  formatRelativeTimeMs: () => '30m ago',
}));

jest.mock('@lib/map/types', () => ({
  MAP_STYLES: {
    DARK: 'mapbox://styles/mapbox/dark-v11',
  },
}));

jest.mock('@components/ui', () => ({
  showToast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="linear-gradient">{children}</View>;
  },
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, numberOfLines, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    );
  },
  Card: ({ children, containerStyle }: any) => {
    const { View } = require('react-native');
    return (
      <View style={containerStyle} testID="card">
        {children}
      </View>
    );
  },
  Icon: ({ name, onPress }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`icon-${name}`} onPress={onPress}>
        <Text>{name}</Text>
      </Pressable>
    );
  },
  Button: ({ title, onPress, buttonStyle, titleStyle, icon }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <Pressable testID={`button-${title?.toLowerCase().replace(/\s+/g, '-')}`} onPress={onPress} style={buttonStyle}>
        {icon ? <View>{icon}</View> : null}
        <Text style={titleStyle}>{title}</Text>
      </Pressable>
    );
  },
  Avatar: ({ title, containerStyle }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View style={containerStyle} testID="avatar">
        <Text>{title}</Text>
      </View>
    );
  },
  Divider: ({ style }: any) => {
    const { View } = require('react-native');
    return <View style={style} testID="divider" />;
  },
}));

describe('IncidentDetailScreen', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      pubkey: 'user-pubkey-123',
      profile: { displayName: 'Test User' },
    };
    mockRouteParams.incidentId = 'test-incident-id';
    mockGetIncident.mockImplementation((id) => (id === 'test-incident-id' ? mockIncident : undefined));
    mockUseIncidentComments.mockReturnValue({
      comments: [],
      isLoading: false,
      isStale: false,
      retry: jest.fn(),
      postComment: jest.fn().mockResolvedValue(undefined),
      deleteComment: jest.fn().mockResolvedValue(undefined),
      recentDeletions: [],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  it('renders core incident details from cache', () => {
    const { getByText } = render(<IncidentDetailScreen />);
    expect(getByText('Major Fire on Broadway')).toBeTruthy();
    expect(getByText(/A large fire has broken out/)).toBeTruthy();
    expect(getByText('FIRE')).toBeTruthy();
    expect(getByText('Severity 4')).toBeTruthy();
    expect(getByText('1500 Broadway')).toBeTruthy();
    expect(getByText('New York, NY')).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
  });

  it('shares the incident from the action bar', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockCurrentUser = null;
    const { getByTestId } = render(<IncidentDetailScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('button-share'));
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining('Major Fire on Broadway'),
      title: 'Major Fire on Broadway',
    });
    shareSpy.mockRestore();
  });

  it('shows not found after cache miss timeout', () => {
    mockGetIncident.mockReturnValue(undefined);
    const { getByText } = render(<IncidentDetailScreen />);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(getByText('Incident not available')).toBeTruthy();
  });
});
