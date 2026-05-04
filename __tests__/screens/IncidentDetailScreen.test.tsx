import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Share } from 'react-native';

import IncidentDetailScreen from '../../screens/IncidentDetailScreen';
import type { ParsedIncident } from '../../lib/nostr/events/types';
import type { UseIncidentCommentsResult } from '../../hooks/useIncidentComments';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams = { incidentId: 'test-incident-id' };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
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

jest.mock('@nostr-dev-kit/mobile', () => {
  const originalModule = jest.requireActual('../../__mocks__/@nostr-dev-kit/mobile');
  return {
    __esModule: true,
    ...originalModule,
    default: originalModule.default ?? originalModule,
    useNDKCurrentUser: () => mockCurrentUser,
  };
});

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

const BLOSSOM_HASH = 'a'.repeat(64);

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
    fire: { icon: 'local-fire-department', color: '#ef4444', gradient: ['#ef4444', '#dc2626'], glyph: '🔥', label: 'Fire' },
    other: { icon: 'warning', color: '#6b7280', gradient: ['#6b7280', '#4b5563'], glyph: '⚠️', label: 'Other' },
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
    act(() => {
      jest.runOnlyPendingTimers();
      jest.clearAllTimers();
    });
  });

  it('renders core incident details from cache', () => {
    const { getByText } = render(<IncidentDetailScreen />);
    expect(getByText('Major Fire on Broadway')).toBeTruthy();
    expect(getByText(/A large fire has broken out/)).toBeTruthy();
    expect(getByText('Fire')).toBeTruthy();
    expect(getByText('Verified')).toBeTruthy();
    expect(getByText('1500 Broadway')).toBeTruthy();
    expect(getByText('30 minutes ago · New York, NY · Community')).toBeTruthy();
  });

  it('renders report image media from the incident event metadata', () => {
    const imageUrl = `https://cdn.example.com/${BLOSSOM_HASH}.jpg`;
    mockGetIncident.mockReturnValue({
      ...mockIncident,
      mediaAttachments: [
        {
          id: `imeta:${BLOSSOM_HASH}:0`,
          url: imageUrl,
          sha256: BLOSSOM_HASH,
          mimeType: 'image/jpeg',
          source: 'imeta',
          renderKind: 'image',
          status: 'renderable',
          fallbackUrls: [],
        },
      ],
    });

    const { getByText, getByTestId } = render(<IncidentDetailScreen />);

    expect(getByText('Report media')).toBeTruthy();
    expect(getByTestId('incident-report-media-image').props.source.uri).toBe(imageUrl);
  });

  it('renders blocked video report media as a safe placeholder', () => {
    mockGetIncident.mockReturnValue({
      ...mockIncident,
      mediaAttachments: [
        {
          id: `imeta:${BLOSSOM_HASH}:0`,
          url: `https://cdn.example.com/${BLOSSOM_HASH}.mp4`,
          sha256: BLOSSOM_HASH,
          mimeType: 'video/mp4',
          source: 'imeta',
          renderKind: 'video',
          status: 'blocked',
          reason: 'video-unsupported',
          fallbackUrls: [],
        },
      ],
    });

    const { getByText, getByTestId } = render(<IncidentDetailScreen />);

    expect(getByTestId('incident-report-media-placeholder')).toBeTruthy();
    expect(getByText('Video attachment')).toBeTruthy();
    expect(getByText('Video preview is not supported.')).toBeTruthy();
  });

  it('shares the incident from the action bar', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockCurrentUser = null;
    const { getByText } = render(<IncidentDetailScreen />);

    await act(async () => {
      fireEvent.press(getByText('Share'));
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining('Major Fire on Broadway'),
      title: 'Major Fire on Broadway',
    });
    shareSpy.mockRestore();
  });

  it('opens the in-app map focused on the incident', () => {
    const { getByText } = render(<IncidentDetailScreen />);

    fireEvent.press(getByText('View on map'));

    expect(mockNavigate).toHaveBeenCalledWith('Main', {
      screen: 'Map',
      params: {
        focusIncident: {
          incidentId: 'test-incident-id',
          eventId: 'test-event-id',
          title: 'Major Fire on Broadway',
          coordinate: [-73.985565, 40.756795],
          requestedAt: expect.any(Number),
        },
      },
    });
  });

  it('shows not found after cache miss timeout', () => {
    mockGetIncident.mockReturnValue(undefined);
    const { getByText } = render(<IncidentDetailScreen />);

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(getByText('Incident not available')).toBeTruthy();
  });

  it('shows comment URLs as plain text and has no comment media preview surface', () => {
    const imageUrl = `https://cdn.example.com/${BLOSSOM_HASH}.png`;

    mockUseIncidentComments.mockReturnValue({
      comments: [
        {
          id: 'comment-with-url',
          authorPubkey: 'comment-author',
          content: `See ${imageUrl}`,
          createdAt: 1700000000,
          createdAtMs: 1700000000000,
          displayName: 'Comment Author',
        },
      ],
      isLoading: false,
      isStale: false,
      retry: jest.fn(),
      postComment: jest.fn().mockResolvedValue(undefined),
      deleteComment: jest.fn().mockResolvedValue(undefined),
      recentDeletions: [],
    });

    const { getByText, queryByTestId } = render(<IncidentDetailScreen />);

    expect(getByText(`See ${imageUrl}`)).toBeTruthy();
    expect(queryByTestId('comment-media-image')).toBeNull();
    expect(queryByTestId('comment-media-placeholder')).toBeNull();
  });
});
