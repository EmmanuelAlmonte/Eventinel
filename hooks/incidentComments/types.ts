import type { NDKEvent as NDKEventType } from '@nostr-dev-kit/mobile';

export type IncidentComment = {
  id: string;
  authorPubkey: string;
  content: string;
  createdAt: number;
  createdAtMs: number;
  displayName: string;
  avatarUrl?: string;
  deletedOnRelays?: string[];
};

export type CommentDeletionNotice = {
  id: string;
  relays: string[];
  timestampMs: number;
};

export type ProfileSummary = {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
};

export type UseIncidentCommentsResult = {
  comments: IncidentComment[];
  isLoading: boolean;
  isStale: boolean;
  retry: () => void;
  postComment: (content: string, replyTo?: IncidentComment) => Promise<void>;
  deleteComment: (comment: IncidentComment) => Promise<void>;
  recentDeletions: CommentDeletionNotice[];
};

export type CommentEvent = NDKEventType;
