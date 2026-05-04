import { act, renderHook } from '@testing-library/react-native';

import { showToast } from '@components/ui';

import { useIncidentCommentsController } from '../../../screens/incidentDetail/useIncidentCommentsController';

const mockPostComment = jest.fn();
const mockDeleteComment = jest.fn();
const mockRetryComments = jest.fn();

jest.mock('@hooks', () => ({
  useIncidentComments: jest.fn(() => ({
    comments: [],
    isLoading: false,
    isStale: false,
    retry: mockRetryComments,
    postComment: mockPostComment,
    deleteComment: mockDeleteComment,
    recentDeletions: [],
  })),
}));

jest.mock('@components/ui', () => ({
  showToast: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockIncident = {
  eventId: 'incident-event-id',
  incidentId: 'incident-id',
  pubkey: 'incident-author-pubkey',
};

function renderController() {
  return renderHook(() =>
    useIncidentCommentsController(mockIncident as any, { pubkey: 'current-user-pubkey' })
  );
}

describe('useIncidentCommentsController text-only comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostComment.mockResolvedValue(undefined);
  });

  it('submits trimmed text comments and clears the composer', async () => {
    const { result } = renderController();

    act(() => {
      result.current.setCommentText('  Text only context  ');
    });

    await act(async () => {
      await result.current.handleCommentSubmit();
    });

    expect(mockPostComment).toHaveBeenCalledWith('Text only context');
    expect(result.current.commentText).toBe('');
  });

  it('does not submit empty or whitespace-only comments', async () => {
    const { result } = renderController();

    await act(async () => {
      await result.current.handleCommentSubmit();
    });

    act(() => {
      result.current.setCommentText('   ');
    });

    await act(async () => {
      await result.current.handleCommentSubmit();
    });

    expect(mockPostComment).not.toHaveBeenCalled();
  });

  it('keeps comments text-only with no media upload API on the controller', () => {
    const { result } = renderController();

    expect((result.current as any).handleAddMedia).toBeUndefined();
    expect((result.current as any).isUploadingMedia).toBeUndefined();
    expect((result.current as any).mediaUploadProgress).toBeUndefined();
    expect((result.current as any).mediaUploadError).toBeUndefined();
  });

  it('shows a toast when comment publish fails without clearing the draft', async () => {
    mockPostComment.mockRejectedValueOnce(new Error('Relay failed'));
    const { result } = renderController();

    act(() => {
      result.current.setCommentText('Keep this draft');
    });

    await act(async () => {
      await result.current.handleCommentSubmit();
    });

    expect(result.current.commentText).toBe('Keep this draft');
    expect(showToast.error).toHaveBeenCalledWith('Failed to post comment', 'Please try again');
  });
});
