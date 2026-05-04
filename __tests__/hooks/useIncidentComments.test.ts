/**
 * useIncidentComments Hook Tests
 *
 * Tests the incident comments hook including:
 * - Comment subscription and filtering
 * - Profile fetching
 * - Comment posting
 * - Comment deletion (NIP-09)
 * - Loading states
 * - Error handling
 *
 * NOTE: This hook has complex subscription logic with multiple useEffects.
 * Tests focus on the core functionality and exported API.
 *
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';

// Mock lib/ndk before importing anything else
jest.mock('@lib/ndk', () => ({
  ndk: {
    fetchEvents: jest.fn().mockResolvedValue(new Set()),
  },
}));

const mockNdk = jest.requireMock('@lib/ndk').ndk as { fetchEvents: jest.Mock };

// Mock NOSTR_KINDS
jest.mock('@lib/nostr/config', () => ({
  NOSTR_KINDS: {
    INCIDENT: 30911,
    ALERT: 1,
    EVENT_DELETION: 5,
    METADATA: 0,
  },
}));

// Create stable mock data
const stableCommentEvents: any[] = [];
const stableDeletionEvents: any[] = [];

// Mock useSubscribe with stable references
jest.mock('@nostr-dev-kit/mobile', () => {
  const originalModule = jest.requireActual('../../__mocks__/@nostr-dev-kit/mobile');

  return {
    ...originalModule,
    useSubscribe: jest.fn((filters, options) => {
      if (filters === false) {
        return { events: [], eose: false };
      }

      // Determine which subscription this is
      const isCommentSubscription = filters?.some?.(
        (f: any) => f.kinds?.includes?.(1) && (f['#a'] || f['#e'])
      );
      const isDeletionSubscription = filters?.some?.(
        (f: any) => f.kinds?.includes?.(5)
      );

      if (isCommentSubscription) {
        return { events: stableCommentEvents, eose: true };
      }
      if (isDeletionSubscription) {
        return { events: stableDeletionEvents, eose: true };
      }

      return { events: [], eose: true };
    }),
  };
});

// Import hooks and types after mocks
import { useIncidentComments } from '../../hooks/useIncidentComments';
import type { ParsedIncident } from '../../lib/nostr/events/types';
import { useSubscribe, NDKEvent } from '@nostr-dev-kit/mobile';

// =============================================================================
// HELPERS
// =============================================================================

function createMockIncident(overrides: Partial<ParsedIncident> = {}): ParsedIncident {
  return {
    eventId: overrides.eventId || 'incident_event_123',
    incidentId: overrides.incidentId || 'incident_123',
    pubkey: overrides.pubkey || 'incident_author_pubkey',
    createdAt: overrides.createdAt || Math.floor(Date.now() / 1000),
    type: overrides.type || 'fire',
    severity: overrides.severity || 3,
    title: overrides.title || 'Test Incident',
    description: overrides.description || 'Test description',
    location: overrides.location || {
      lat: 39.9526,
      lng: -75.1652,
      address: '123 Main St',
      geohash: 'dr4e8',
    },
    occurredAt: overrides.occurredAt || new Date(),
    source: overrides.source || 'community',
    sourceId: overrides.sourceId || 'src_123',
    isVerified: overrides.isVerified || false,
  };
}

function createMockCommentEvent(overrides: Partial<any> = {}) {
  const id = overrides.id || 'comment_' + Math.random().toString(36).slice(2);
  const pubkey = overrides.pubkey || 'commenter_pubkey';
  const createdAt = overrides.created_at || Math.floor(Date.now() / 1000);

  return {
    id,
    pubkey,
    kind: 1,
    created_at: createdAt,
    content: overrides.content ?? 'This is a test comment',
    tags: overrides.tags || [
      ['e', 'incident_event_123', '', 'root'],
      ['a', '30911:incident_author_pubkey:incident_123', '', 'root'],
      ['p', 'incident_author_pubkey'],
    ],
  };
}

function createMockProfileEvent(pubkey: string, profile: any) {
  return {
    id: 'profile_' + pubkey.slice(0, 8),
    pubkey,
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify(profile),
    tags: [],
  };
}

// Helper to clear and set events
function setCommentEvents(events: any[]) {
  stableCommentEvents.length = 0;
  events.forEach((e) => stableCommentEvents.push(e));
}

function setDeletionEvents(events: any[]) {
  stableDeletionEvents.length = 0;
  events.forEach((e) => stableDeletionEvents.push(e));
}

function capturePublishedEvents() {
  const events: Array<{ kind: number; content: string; tags: string[][] }> = [];
  const spy = jest.spyOn(NDKEvent.prototype, 'publish').mockImplementation(function (this: any) {
    events.push({
      kind: this.kind,
      content: this.content,
      tags: this.tags,
    });
    return Promise.resolve(new Set() as any);
  });

  return { events, spy };
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe('useIncidentComments', () => {
  beforeEach(() => {
    stableCommentEvents.length = 0;
    stableDeletionEvents.length = 0;
    jest.clearAllMocks();
    mockNdk.fetchEvents.mockResolvedValue(new Set());
  });

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('Initial State', () => {
    it('returns empty comments array when no incident', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(result.current.comments).toEqual([]);
    });

    it('returns empty recentDeletions array', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(result.current.recentDeletions).toEqual([]);
    });

    it('returns postComment function', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(typeof result.current.postComment).toBe('function');
    });

    it('returns deleteComment function', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(typeof result.current.deleteComment).toBe('function');
    });

    it('returns retry function', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(typeof result.current.retry).toBe('function');
    });

    it('has isLoading boolean property', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('has isStale boolean property', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(typeof result.current.isStale).toBe('boolean');
    });
  });

  // =============================================================================
  // SUBSCRIPTION TESTS
  // =============================================================================

  describe('Subscription', () => {
    it('does not subscribe when incident is null', () => {
      renderHook(() => useIncidentComments(null));

      // First call should be with false (disabled)
      expect(useSubscribe).toHaveBeenCalledWith(false, expect.any(Object));
    });

    it('does not subscribe when incident is undefined', () => {
      renderHook(() => useIncidentComments(undefined));

      expect(useSubscribe).toHaveBeenCalledWith(false, expect.any(Object));
    });

    it('subscribes when incident is provided', () => {
      const incident = createMockIncident();
      renderHook(() => useIncidentComments(incident));

      // Should have been called with filter arrays
      const calls = (useSubscribe as jest.Mock).mock.calls;
      const hasFilterCall = calls.some(
        (call: any[]) => Array.isArray(call[0]) && call[0].length > 0
      );
      expect(hasFilterCall).toBe(true);
    });
  });

  // =============================================================================
  // COMMENT PARSING TESTS
  // =============================================================================

  describe('Comment Parsing', () => {
    it('parses comment events into comments array', async () => {
      const incident = createMockIncident();
      const commentEvent = createMockCommentEvent({
        id: 'comment_1',
        content: 'Test comment content',
        pubkey: 'user_pubkey_123',
        created_at: 1700000000,
      });

      setCommentEvents([commentEvent]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      expect(result.current.comments[0].content).toBe('Test comment content');
      expect(result.current.comments[0].authorPubkey).toBe('user_pubkey_123');
    });

    it('includes comment id in parsed comment', async () => {
      const incident = createMockIncident();
      const commentEvent = createMockCommentEvent({
        id: 'specific_comment_id',
      });

      setCommentEvents([commentEvent]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      expect(result.current.comments[0].id).toBe('specific_comment_id');
    });

    it('calculates createdAtMs from created_at', async () => {
      const incident = createMockIncident();
      const createdAt = 1700000000;
      const commentEvent = createMockCommentEvent({
        created_at: createdAt,
      });

      setCommentEvents([commentEvent]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      expect(result.current.comments[0].createdAt).toBe(createdAt);
      expect(result.current.comments[0].createdAtMs).toBe(createdAt * 1000);
    });

    it('generates display name from pubkey when no profile', async () => {
      const incident = createMockIncident();
      const pubkey = 'abcdef1234567890abcdef1234567890';
      const commentEvent = createMockCommentEvent({ pubkey });

      setCommentEvents([commentEvent]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      // Display name should be truncated pubkey format
      expect(result.current.comments[0].displayName).toContain('abcdef12');
    });

    it('sorts comments by createdAtMs descending (newest first)', async () => {
      const incident = createMockIncident();
      const now = Math.floor(Date.now() / 1000);

      setCommentEvents([
        createMockCommentEvent({
          id: 'older',
          created_at: now - 1000,
          content: 'Older comment',
        }),
        createMockCommentEvent({
          id: 'newer',
          created_at: now,
          content: 'Newer comment',
        }),
      ]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(2);
      });

      expect(result.current.comments[0].content).toBe('Newer comment');
      expect(result.current.comments[1].content).toBe('Older comment');
    });

    it('filters out events with empty content', async () => {
      const incident = createMockIncident();

      setCommentEvents([
        createMockCommentEvent({ id: 'valid', content: 'Valid content' }),
        createMockCommentEvent({ id: 'empty', content: '' }),
      ]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      expect(result.current.comments[0].content).toBe('Valid content');
    });

    it('keeps media-looking comment tags as text-only comment data', async () => {
      const incident = createMockIncident();
      const mediaUrl = `https://cdn.example.com/${'a'.repeat(64)}.png`;

      setCommentEvents([
        createMockCommentEvent({
          id: 'comment-with-media-looking-tags',
          content: `See ${mediaUrl}`,
          tags: [
            ['e', 'incident_event_123', '', 'root'],
            ['a', '30911:incident_author_pubkey:incident_123', '', 'root'],
            ['p', 'incident_author_pubkey'],
            [
              'imeta',
              `url ${mediaUrl}`,
              `x ${'a'.repeat(64)}`,
              'm image/png',
              'size 1234',
              'dim 640x480',
            ],
          ],
        }),
      ]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(1);
      });

      expect(result.current.comments[0].content).toBe(`See ${mediaUrl}`);
      expect((result.current.comments[0] as any).media).toBeUndefined();
      expect(mockNdk.fetchEvents).not.toHaveBeenCalledWith(
        expect.objectContaining({ kinds: [10063] }),
        expect.any(Object)
      );
    });
  });

  // =============================================================================
  // POST COMMENT TESTS
  // =============================================================================

  describe('Post Comment', () => {
    it('throws error when incident is not available', async () => {
      const { result } = renderHook(() => useIncidentComments(null));

      await expect(
        result.current.postComment('Test comment')
      ).rejects.toThrow('Incident is not available');
    });

    it('does nothing for whitespace-only content', async () => {
      const incident = createMockIncident();
      const { result } = renderHook(() => useIncidentComments(incident));

      // Should not throw, just return
      await act(async () => {
        await result.current.postComment('   ');
      });
    });

    it('does nothing for empty content', async () => {
      const incident = createMockIncident();
      const { result } = renderHook(() => useIncidentComments(incident));

      await act(async () => {
        await result.current.postComment('');
      });
    });

    it('publishes text-only comments with the existing incident tags', async () => {
      const incident = createMockIncident();
      const { events, spy } = capturePublishedEvents();
      const { result } = renderHook(() => useIncidentComments(incident));

      await act(async () => {
        await result.current.postComment('  Text only comment  ');
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        kind: 1,
        content: 'Text only comment',
      });
      expect(events[0].tags).toEqual(
        expect.arrayContaining([
          ['a', '30911:incident_author_pubkey:incident_123'],
          ['e', 'incident_event_123'],
          ['p', 'incident_author_pubkey'],
        ])
      );
      expect(events[0].tags.some((tag) => tag[0] === 'imeta')).toBe(false);
      spy.mockRestore();
    });

    it('preserves the legacy replyTo argument when posting a reply', async () => {
      const incident = createMockIncident();
      const { events, spy } = capturePublishedEvents();
      const { result } = renderHook(() => useIncidentComments(incident));

      await act(async () => {
        await result.current.postComment('Reply with context', {
          id: 'reply-comment-id',
          authorPubkey: 'reply-author-pubkey',
          content: 'original',
          createdAt: 1700000000,
          createdAtMs: 1700000000000,
          displayName: 'Reply Author',
        });
      });

      expect(events[0].tags).toEqual(
        expect.arrayContaining([
          ['e', 'reply-comment-id'],
          ['p', 'reply-author-pubkey'],
        ])
      );
      spy.mockRestore();
    });

    it('publishes URL text without media metadata tags', async () => {
      const incident = createMockIncident();
      const { events, spy } = capturePublishedEvents();
      const { result } = renderHook(() => useIncidentComments(incident));

      await act(async () => {
        await result.current.postComment('https://cdn.example.com/media.jpg');
      });

      expect(events).toHaveLength(1);
      expect(events[0].content).toBe('https://cdn.example.com/media.jpg');
      expect(events[0].tags.some((tag) => ['imeta', 'r', 'x', 'm', 'size', 'dim'].includes(tag[0]))).toBe(false);
      spy.mockRestore();
    });
  });

  // =============================================================================
  // DELETE COMMENT TESTS
  // =============================================================================

  describe('Delete Comment', () => {
    it('throws error when comment is null', async () => {
      const { result } = renderHook(() => useIncidentComments(null));

      await expect(
        result.current.deleteComment(null as any)
      ).rejects.toThrow('Comment is not available');
    });

    it('throws error when comment has no id', async () => {
      const { result } = renderHook(() => useIncidentComments(null));

      await expect(
        result.current.deleteComment({ id: '' } as any)
      ).rejects.toThrow('Comment is not available');
    });

    it('throws error when comment is undefined', async () => {
      const { result } = renderHook(() => useIncidentComments(null));

      await expect(
        result.current.deleteComment(undefined as any)
      ).rejects.toThrow('Comment is not available');
    });
  });

  // =============================================================================
  // RETRY FUNCTIONALITY TESTS
  // =============================================================================

  describe('Retry Functionality', () => {
    it('retry function can be called without error', async () => {
      const incident = createMockIncident();
      const { result } = renderHook(() => useIncidentComments(incident));

      // Should not throw
      act(() => {
        result.current.retry();
      });
    });

    it('retry triggers a fresh comment subscription filter reference', () => {
      const incident = createMockIncident();
      const { result } = renderHook(() => useIncidentComments(incident));

      const getLatestCommentFilter = () => {
        const commentCalls = (useSubscribe as jest.Mock).mock.calls.filter(
          (call: any[]) =>
            Array.isArray(call[0]) &&
            call[0].some((filter: any) => filter.kinds?.includes?.(1) && (filter['#a'] || filter['#e']))
        );
        return commentCalls[commentCalls.length - 1]?.[0];
      };

      const beforeRetry = getLatestCommentFilter();

      act(() => {
        result.current.retry();
      });

      const afterRetry = getLatestCommentFilter();

      expect(beforeRetry).toBeDefined();
      expect(afterRetry).toBeDefined();
      expect(afterRetry).not.toBe(beforeRetry);
    });
  });

  // =============================================================================
  // RESULT SHAPE TESTS
  // =============================================================================

  describe('Result Shape', () => {
    it('returns object with expected properties', () => {
      const { result } = renderHook(() => useIncidentComments(null));

      expect(result.current).toHaveProperty('comments');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isStale');
      expect(result.current).toHaveProperty('retry');
      expect(result.current).toHaveProperty('postComment');
      expect(result.current).toHaveProperty('deleteComment');
      expect(result.current).toHaveProperty('recentDeletions');
    });

    it('comments is always an array', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(Array.isArray(result.current.comments)).toBe(true);
    });

    it('recentDeletions is always an array', () => {
      const { result } = renderHook(() => useIncidentComments(null));
      expect(Array.isArray(result.current.recentDeletions)).toBe(true);
    });
  });

  // =============================================================================
  // INCIDENT ADDRESS BUILDING TESTS
  // =============================================================================

  describe('Incident Address', () => {
    it('builds correct incident address format', () => {
      const incident = createMockIncident({
        pubkey: 'author_pubkey_xyz',
        incidentId: 'incident_id_abc',
      });

      renderHook(() => useIncidentComments(incident));

      // Verify useSubscribe was called with filters containing the address
      const calls = (useSubscribe as jest.Mock).mock.calls;
      const filterCall = calls.find(
        (call: any[]) => Array.isArray(call[0]) && call[0].some((f: any) => f['#a'])
      );

      if (filterCall) {
        const filters = filterCall[0];
        const aTagFilter = filters.find((f: any) => f['#a']);
        expect(aTagFilter['#a']).toContain('30911:author_pubkey_xyz:incident_id_abc');
      }
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles incident with special characters in incidentId', () => {
      const incident = createMockIncident({
        incidentId: 'incident-with-dashes_and_underscores',
      });

      // Should not throw
      expect(() => {
        renderHook(() => useIncidentComments(incident));
      }).not.toThrow();
    });

    it('handles rapid incident changes', () => {
      const incident1 = createMockIncident({ eventId: 'event1' });
      const incident2 = createMockIncident({ eventId: 'event2' });

      type HookProps = { incident: ParsedIncident | null };
      const { rerender } = renderHook<ReturnType<typeof useIncidentComments>, HookProps>(
        ({ incident }) => useIncidentComments(incident),
        { initialProps: { incident: incident1 } }
      );

      // Rapid changes should not throw
      rerender({ incident: incident2 });
      rerender({ incident: null });
      rerender({ incident: incident1 });
    });

    it('handles multiple comments from same author', async () => {
      const incident = createMockIncident();
      const now = Math.floor(Date.now() / 1000);

      setCommentEvents([
        createMockCommentEvent({
          id: 'comment1',
          pubkey: 'same_author',
          created_at: now,
        }),
        createMockCommentEvent({
          id: 'comment2',
          pubkey: 'same_author',
          created_at: now - 100,
        }),
      ]);

      const { result } = renderHook(() => useIncidentComments(incident));

      await waitFor(() => {
        expect(result.current.comments.length).toBe(2);
      });

      // Both comments should have same author
      expect(result.current.comments[0].authorPubkey).toBe('same_author');
      expect(result.current.comments[1].authorPubkey).toBe('same_author');
    });
  });
});
