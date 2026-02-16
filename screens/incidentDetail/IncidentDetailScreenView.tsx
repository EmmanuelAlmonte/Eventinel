import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Divider } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { TYPE_CONFIG, SEVERITY_COLORS } from '@lib/nostr/config';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

import { IncidentCommentsSection } from './IncidentCommentsSection';
import { IncidentDetailActionBar } from './IncidentDetailActionBar';
import { IncidentDetailHeaderBar } from './IncidentDetailHeaderBar';
import { IncidentDetailInfoCards } from './IncidentDetailInfoCards';
import { IncidentDetailMiniMap } from './IncidentDetailMiniMap';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  surface: string;
  success: string;
  text: string;
  textMuted: string;
  warning: string;
};

type IncidentDetailCommentsController = {
  commentText: string;
  setCommentText: (value: string) => void;
  isSubmitting: boolean;
  isUploadingMedia: boolean;
  comments: any[];
  isLoadingComments: boolean;
  commentsAreStale: boolean;
  retryComments: () => void;
  recentDeletions: any[];
  showAllComments: boolean;
  setShowAllComments: (value: boolean) => void;
  deletingCommentId: string | null;
  handleCommentSubmit: () => Promise<void>;
  handleAddMedia: () => Promise<void>;
  confirmDeleteComment: (comment: any) => void;
};

type IncidentDetailScreenViewProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  incident: ProcessedIncident;
  currentUser: { pubkey: string } | null;
  comments: IncidentDetailCommentsController;
  onBack: () => void;
  onShare: () => Promise<void>;
  onDirections: () => void;
};

export function IncidentDetailScreenView({
  colors,
  insets,
  incident,
  currentUser,
  comments,
  onBack,
  onShare,
  onDirections,
}: IncidentDetailScreenViewProps) {
  const typeConfig = TYPE_CONFIG[incident.type] || TYPE_CONFIG.other;
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[1];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <IncidentDetailHeaderBar
        colors={colors}
        insets={insets}
        onBack={onBack}
        onShare={() => void onShare()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <IncidentDetailMiniMap
          location={incident.location}
          markerColor={typeConfig.color}
          markerGlyph={typeConfig.glyph}
          spinnerColor={colors.textMuted}
        />

        <IncidentDetailInfoCards
          incident={incident}
          colors={colors}
          typeConfig={typeConfig}
          severityColor={severityColor}
        />

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        <IncidentCommentsSection
          colors={colors}
          comments={comments.comments}
          isLoadingComments={comments.isLoadingComments}
          commentsAreStale={comments.commentsAreStale}
          retryComments={comments.retryComments}
          recentDeletions={comments.recentDeletions}
          showAllComments={comments.showAllComments}
          onShowAllComments={() => comments.setShowAllComments(true)}
          currentUserPubkey={currentUser?.pubkey}
          deletingCommentId={comments.deletingCommentId}
          onDeleteComment={comments.confirmDeleteComment}
        />
      </ScrollView>

      <IncidentDetailActionBar
        colors={colors}
        insets={insets}
        isAuthenticated={Boolean(currentUser)}
        typeConfig={typeConfig}
        commentText={comments.commentText}
        setCommentText={comments.setCommentText}
        isSubmitting={comments.isSubmitting}
        isUploadingMedia={comments.isUploadingMedia}
        onAddMedia={() => void comments.handleAddMedia()}
        onSubmitComment={() => void comments.handleCommentSubmit()}
        onShare={() => void onShare()}
        onDirections={onDirections}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  divider: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});
