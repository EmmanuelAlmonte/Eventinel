/**
 * IncidentDetailScreen Component Tests
 *
 * Tests the incident detail screen functionality including:
 * - Incident information display
 * - Loading and error states
 * - Comment system
 * - Share and directions actions
 * - Navigation back
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Share, Linking, Platform } from 'react-native';

// Import the component
import IncidentDetailScreen from '../../screens/IncidentDetailScreen';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock navigation and route
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams = { incidentId: 'test-incident-id' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
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

// Mock current user
const mockCurrentUser = {
  pubkey: 'user-pubkey-123',
  profile: { displayName: 'Test User' },
};

jest.mock('@nostr-dev-kit/ndk-mobile', () => ({
  useNDKCurrentUser: () => mockCurrentUser,
}));

// Mock hooks
const mockUseIncidentComments = jest.fn(() => ({
  comments: [],
  isLoading: false,
  isStale: false,
  retry: jest.fn(),
  postComment: jest.fn(),
  deleteComment: jest.fn(),
  recentDeletions: [],
}));

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
  }),
  useIncidentComments: (...args: any[]) => mockUseIncidentComments(...args),
}));

// Mock incident from cache
const mockIncident = {
  incidentId: 'test-incident-id',
  eventId: 'test-event-id',
  pubkey: 'incident-author-pubkey',
  title: 'Major Fire on Broadway',
  description: 'A large fire has broken out in a commercial building on Broadway near 42nd Street. Multiple fire units responding.',
  type: 'fire',
  severity: 4,
  source: 'community',
  isVerified: true,
  location: {
    lat: 40.756795,
    lng: -73.985565,
    address: '1500 Broadway',
    city: 'New York',
    state: 'NY',
  },
  occurredAt: Math.floor(Date.now() / 1000) - 1800,
};

const mockGetIncident = jest.fn((id: string) => id === 'test-incident-id' ? mockIncident : undefined);
const mockUseIncidentCache = jest.fn(() => ({
  getIncident: mockGetIncident,
  version: 1,
}));

jest.mock('@contexts', () => ({
  useIncidentCache: () => mockUseIncidentCache(),
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
    fire: { icon: 'local-fire-department', color: '#ef4444', gradient: ['#ef4444', '#dc2626'], glyph: '🔥' },
    traffic: { icon: 'traffic', color: '#f97316', gradient: ['#f97316', '#ea580c'], glyph: '🚗' },
    medical: { icon: 'medical-services', color: '#ec4899', gradient: ['#ec4899', '#db2777'], glyph: '🏥' },
    other: { icon: 'warning', color: '#6b7280', gradient: ['#6b7280', '#4b5563'], glyph: '⚠️' },
  },
}));

// Mock time utils
jest.mock('@lib/utils/time', () => ({
  formatRelativeTime: (timestamp: number) => '30 minutes ago',
  formatRelativeTimeMs: (ms: number) => '30m ago',
}));

// Mock map types
jest.mock('@lib/map/types', () => ({
  MAP_STYLES: {
    DARK: 'mapbox://styles/mapbox/dark-v11',
  },
}));

// Mock toast
jest.mock('@components/ui', () => ({
  showToast: {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="linear-gradient">{children}</View>;
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
    return <View style={containerStyle} testID="card">{children}</View>;
  },
  Icon: ({ name, color, size, type, onPress }: any) => {
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
        {icon && <View>{icon}</View>}
        <Text style={titleStyle}>{title}</Text>
      </Pressable>
    );
  },
  Avatar: ({ title, source, containerStyle, size }: any) => {
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

// =============================================================================
// TEST SUITE
// =============================================================================

describe('IncidentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIncident.mockImplementation((id) => id === 'test-incident-id' ? mockIncident : undefined);
    mockUseIncidentComments.mockReturnValue({
      comments: [],
      isLoading: false,
      isStale: false,
      retry: jest.fn(),
      postComment: jest.fn(),
      deleteComment: jest.fn(),
      recentDeletions: [],
    });
    mockRouteParams.incidentId = 'test-incident-id';
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders incident title', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Major Fire on Broadway')).toBeTruthy();
    });

    it('renders incident description', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/A large fire has broken out/)).toBeTruthy();
    });

    it('renders incident type badge', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('FIRE')).toBeTruthy();
    });

    it('renders severity pill', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Severity 4')).toBeTruthy();
    });

    it('renders location address', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('1500 Broadway')).toBeTruthy();
    });

    it('renders location city and state', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('New York, NY')).toBeTruthy();
    });

    it('renders source information', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/Source: community/)).toBeTruthy();
    });

    it('renders verified badge for verified incidents', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('VERIFIED')).toBeTruthy();
    });
  });

  // =============================================================================
  // NAVIGATION TESTS
  // =============================================================================

  describe('Navigation', () => {
    it('renders back button', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Back')).toBeTruthy();
    });

    it('calls goBack when back button is pressed', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      const backButton = getByText('Back');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('renders back chevron icon', () => {
      const { getByTestId } = render(<IncidentDetailScreen />);
      expect(getByTestId('icon-chevron-left')).toBeTruthy();
    });
  });

  // =============================================================================
  // HEADER ELEMENTS TESTS
  // =============================================================================

  describe('Header Elements', () => {
    it('renders live indicator', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    it('renders share button', () => {
      const { getByTestId } = render(<IncidentDetailScreen />);
      expect(getByTestId('icon-share')).toBeTruthy();
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('shows loading indicator when incident not found initially', async () => {
      mockGetIncident.mockReturnValue(undefined);

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Loading incident...')).toBeTruthy();
    });

    it('shows error state after timeout when incident not found', async () => {
      mockGetIncident.mockReturnValue(undefined);

      jest.useFakeTimers();
      const { getByText, queryByText } = render(<IncidentDetailScreen />);

      // Fast-forward past the 2 second timeout
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      await waitFor(() => {
        expect(getByText('Incident not available')).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('shows go back button in error state', async () => {
      mockGetIncident.mockReturnValue(undefined);

      jest.useFakeTimers();
      const { getByTestId } = render(<IncidentDetailScreen />);

      await act(async () => {
        jest.advanceTimersByTime(2100);
      });

      await waitFor(() => {
        expect(getByTestId('button-go-back')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  // =============================================================================
  // SHARE FUNCTIONALITY TESTS
  // =============================================================================

  describe('Share Functionality', () => {
    it('opens share dialog when share button is pressed', async () => {
      const mockShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

      const { getByTestId } = render(<IncidentDetailScreen />);
      const shareButton = getByTestId('icon-share');

      await act(async () => {
        fireEvent.press(shareButton);
      });

      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining('Major Fire on Broadway'),
        title: 'Major Fire on Broadway',
      });

      mockShare.mockRestore();
    });

    it('includes address in share message', async () => {
      const mockShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

      const { getByTestId } = render(<IncidentDetailScreen />);
      const shareButton = getByTestId('icon-share');

      await act(async () => {
        fireEvent.press(shareButton);
      });

      expect(mockShare).toHaveBeenCalledWith({
        message: expect.stringContaining('1500 Broadway'),
        title: expect.any(String),
      });

      mockShare.mockRestore();
    });
  });

  // =============================================================================
  // DIRECTIONS FUNCTIONALITY TESTS
  // =============================================================================

  describe('Directions Functionality', () => {
    it('renders directions button when user is not logged in', () => {
      // The directions button shows for non-logged-in users
      const { getByText } = render(<IncidentDetailScreen />);
      // Check for Get Directions text in the button
      expect(getByText('Get Directions')).toBeTruthy();
    });

    it('opens maps app when directions button is pressed', async () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      Platform.OS = 'android';

      const { getByText } = render(<IncidentDetailScreen />);
      const directionsButton = getByText('Get Directions');

      await act(async () => {
        fireEvent.press(directionsButton);
      });

      expect(mockOpenURL).toHaveBeenCalled();

      mockOpenURL.mockRestore();
    });
  });

  // =============================================================================
  // COMMENTS SECTION TESTS
  // =============================================================================

  describe('Comments Section', () => {
    it('renders comments section header', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/Comments/)).toBeTruthy();
    });

    it('shows comment count in header', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/Comments \(0\)/)).toBeTruthy();
    });

    it('shows empty comments message when no comments', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('No comments yet')).toBeTruthy();
    });

    it('shows prompt to be first commenter', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Be the first to share what you know')).toBeTruthy();
    });

    it('renders comments when available', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [
          {
            id: 'comment-1',
            authorPubkey: 'author-1',
            content: 'I can see smoke from my window',
            createdAt: Math.floor(Date.now() / 1000) - 600,
            createdAtMs: Date.now() - 600000,
            displayName: 'John Doe',
          },
        ],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('I can see smoke from my window')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('shows loading state for comments', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [],
        isLoading: true,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Loading comments...')).toBeTruthy();
    });

    it('shows stale comments banner with retry button', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [],
        isLoading: false,
        isStale: true,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/Relays slow/)).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls retry when retry button is pressed', () => {
      const mockRetry = jest.fn();
      mockUseIncidentComments.mockReturnValue({
        comments: [],
        isLoading: false,
        isStale: true,
        retry: mockRetry,
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      const retryButton = getByText('Retry');

      fireEvent.press(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // COMMENT COMPOSER TESTS
  // =============================================================================

  describe('Comment Composer (Logged In)', () => {
    it('renders comment input when user is logged in', () => {
      const { getByPlaceholderText } = render(<IncidentDetailScreen />);
      expect(getByPlaceholderText('Add a comment...')).toBeTruthy();
    });

    it('renders send button', () => {
      const { getByTestId } = render(<IncidentDetailScreen />);
      expect(getByTestId('icon-send')).toBeTruthy();
    });

    it('allows typing in comment input', () => {
      const { getByPlaceholderText } = render(<IncidentDetailScreen />);
      const input = getByPlaceholderText('Add a comment...');

      fireEvent.changeText(input, 'Test comment');

      expect(input.props.value).toBe('Test comment');
    });

    it('calls postComment when send button is pressed with text', async () => {
      const mockPostComment = jest.fn().mockResolvedValue(undefined);
      mockUseIncidentComments.mockReturnValue({
        comments: [],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: mockPostComment,
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByPlaceholderText, getByTestId } = render(<IncidentDetailScreen />);
      const input = getByPlaceholderText('Add a comment...');
      const sendButton = getByTestId('icon-send');

      fireEvent.changeText(input, 'My comment');
      await act(async () => {
        fireEvent.press(sendButton);
      });

      expect(mockPostComment).toHaveBeenCalledWith('My comment');
    });
  });

  // =============================================================================
  // COMMENT DELETION TESTS
  // =============================================================================

  describe('Comment Deletion', () => {
    const mockComment = {
      id: 'comment-1',
      authorPubkey: 'user-pubkey-123', // Same as mockCurrentUser.pubkey
      content: 'My deletable comment',
      createdAt: Math.floor(Date.now() / 1000) - 600,
      createdAtMs: Date.now() - 600000,
      displayName: 'Test User',
    };

    it('shows delete menu for own comments', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [mockComment],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByTestId } = render(<IncidentDetailScreen />);
      expect(getByTestId('icon-more-vert')).toBeTruthy();
    });

    it('shows delete confirmation when delete is triggered', async () => {
      const mockDeleteComment = jest.fn();
      mockUseIncidentComments.mockReturnValue({
        comments: [mockComment],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: mockDeleteComment,
        recentDeletions: [],
      });

      const { getByTestId } = render(<IncidentDetailScreen />);
      const menuButton = getByTestId('icon-more-vert');

      fireEvent.press(menuButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete comment?',
        expect.any(String),
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('shows deletion notice banner', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [
          { id: 'deleted-1', relays: ['wss://relay1.com'], timestampMs: Date.now() },
        ],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText(/1 comment deleted/)).toBeTruthy();
    });
  });

  // =============================================================================
  // SHOW MORE COMMENTS TESTS
  // =============================================================================

  describe('Show More Comments', () => {
    it('shows "Show more" button when more than 2 comments', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [
          { id: '1', authorPubkey: 'a', content: 'Comment 1', createdAtMs: Date.now(), displayName: 'User 1' },
          { id: '2', authorPubkey: 'b', content: 'Comment 2', createdAtMs: Date.now(), displayName: 'User 2' },
          { id: '3', authorPubkey: 'c', content: 'Comment 3', createdAtMs: Date.now(), displayName: 'User 3' },
          { id: '4', authorPubkey: 'd', content: 'Comment 4', createdAtMs: Date.now(), displayName: 'User 4' },
        ],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Show 2 more comments')).toBeTruthy();
    });

    it('expands to show all comments when button is pressed', () => {
      mockUseIncidentComments.mockReturnValue({
        comments: [
          { id: '1', authorPubkey: 'a', content: 'Comment 1', createdAtMs: Date.now(), displayName: 'User 1' },
          { id: '2', authorPubkey: 'b', content: 'Comment 2', createdAtMs: Date.now(), displayName: 'User 2' },
          { id: '3', authorPubkey: 'c', content: 'Comment 3', createdAtMs: Date.now(), displayName: 'User 3' },
        ],
        isLoading: false,
        isStale: false,
        retry: jest.fn(),
        postComment: jest.fn(),
        deleteComment: jest.fn(),
        recentDeletions: [],
      });

      const { getByText, queryByText } = render(<IncidentDetailScreen />);
      const showMoreButton = getByText('Show 1 more comments');

      fireEvent.press(showMoreButton);

      expect(queryByText('Show 1 more comments')).toBeNull();
    });
  });

  // =============================================================================
  // INCIDENT TYPE CARD TESTS
  // =============================================================================

  describe('Incident Type Card', () => {
    it('renders incident details card header', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Incident Details')).toBeTruthy();
    });

    it('renders location card', () => {
      const { getByText } = render(<IncidentDetailScreen />);
      expect(getByText('Location')).toBeTruthy();
    });

    it('renders gradient icon container', () => {
      const { getAllByTestId } = render(<IncidentDetailScreen />);
      const gradients = getAllByTestId('linear-gradient');
      expect(gradients.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // UNVERIFIED INCIDENT TESTS
  // =============================================================================

  describe('Unverified Incidents', () => {
    it('does not show verified badge for unverified incidents', () => {
      mockGetIncident.mockReturnValue({
        ...mockIncident,
        isVerified: false,
      });

      const { queryByText } = render(<IncidentDetailScreen />);
      expect(queryByText('VERIFIED')).toBeNull();
    });
  });
});
