import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@rneui/themed';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { type CommentDeletionNotice, type IncidentComment } from '@hooks';
import { TYPE_CONFIG, SEVERITY_COLORS } from '@lib/nostr/config';
import { incidentTypeIconAssetByType } from '@lib/map/incidentTypeIconAssets';
import type { ProcessedIncident } from '@hooks/useIncidentSubscription';

import { IncidentCommentsSection } from './IncidentCommentsSection';
import { IncidentDetailActionBar } from './IncidentDetailActionBar';
import { IncidentDetailHeaderBar } from './IncidentDetailHeaderBar';
import { IncidentDetailInfoCards } from './IncidentDetailInfoCards';
import { IncidentDetailMiniMap } from './IncidentDetailMiniMap';
import { IncidentDetailUpdatesSection } from './IncidentDetailUpdatesSection';

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
  comments: IncidentComment[];
  isLoadingComments: boolean;
  commentsAreStale: boolean;
  retryComments: () => void;
  recentDeletions: CommentDeletionNotice[];
  showAllComments: boolean;
  setShowAllComments: (value: boolean) => void;
  deletingCommentId: string | null;
  handleCommentSubmit: () => Promise<void>;
  handleAddMedia: () => Promise<void>;
  confirmDeleteComment: (comment: IncidentComment) => void;
};

type IncidentDetailScreenViewProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  incident: ProcessedIncident;
  currentUser: { pubkey: string } | null;
  comments: IncidentDetailCommentsController;
  onBack: () => void;
  onShare: () => Promise<void>;
};

export function IncidentDetailScreenView({
  colors,
  insets,
  incident,
  currentUser,
  comments,
  onBack,
  onShare,
}: IncidentDetailScreenViewProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const typeConfig = TYPE_CONFIG[incident.type] || TYPE_CONFIG.other;
  const typeIconSource = incidentTypeIconAssetByType[incident.type] || incidentTypeIconAssetByType.other;
  const severityColor = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[1];
  const heroHeight = Math.max(232, Math.min(320, Math.round(screenHeight * 0.31)));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroContainer, { height: heroHeight }]}>
          <IncidentDetailMiniMap
            location={incident.location}
            markerColor={typeConfig.color}
            markerIconSource={typeIconSource}
            markerIconTintColor={severityColor}
            isExpanded={isMapExpanded}
            onExpand={setIsMapExpanded}
            hero
          />
          <IncidentDetailHeaderBar
            colors={colors}
            insets={insets}
            onBack={onBack}
            onRightAction={() => setIsMapExpanded(true)}
            rightActionIcon="open-in-full"
            rightActionLabel="Expand map"
            overlay
          />
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <IncidentDetailInfoCards
            incident={incident}
            colors={colors}
            typeConfig={typeConfig}
            typeIconSource={typeIconSource}
            severityColor={severityColor}
            onShare={() => void onShare()}
          />

          <IncidentDetailUpdatesSection
            incident={incident}
            colors={{
              border: colors.border,
              primary: colors.primary,
              success: colors.success,
              surface: colors.surface,
              text: colors.text,
              textMuted: colors.textMuted,
            }}
          />

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
        </View>
      </ScrollView>

      <IncidentDetailActionBar
        colors={colors}
        insets={insets}
        isAuthenticated={Boolean(currentUser)}
        commentText={comments.commentText}
        setCommentText={comments.setCommentText}
        isSubmitting={comments.isSubmitting}
        isUploadingMedia={comments.isUploadingMedia}
        onAddMedia={() => void comments.handleAddMedia()}
        onSubmitComment={() => void comments.handleCommentSubmit()}
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
  heroContainer: {
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sheet: {
    marginTop: -14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 24,
  },
});
