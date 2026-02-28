import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Icon, Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import type { EdgeInsets } from 'react-native-safe-area-context';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type TypeConfig = {
  gradient: [string, string, ...string[]];
};

type IncidentDetailActionBarProps = {
  colors: ThemeColors;
  insets: EdgeInsets;
  isAuthenticated: boolean;
  typeConfig: TypeConfig;
  commentText: string;
  setCommentText: (value: string) => void;
  isSubmitting: boolean;
  isUploadingMedia: boolean;
  onAddMedia: () => void;
  onSubmitComment: () => void;
  onShare: () => void;
  onDirections: () => void;
};

export function IncidentDetailActionBar({
  colors,
  insets,
  isAuthenticated,
  typeConfig,
  commentText,
  setCommentText,
  isSubmitting,
  isUploadingMedia,
  onAddMedia,
  onSubmitComment,
  onShare,
  onDirections,
}: IncidentDetailActionBarProps) {
  return (
    <View
      style={[
        styles.actionBar,
        {
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {isAuthenticated ? (
        <View style={styles.composerRow}>
          <Pressable
            onPress={onAddMedia}
            disabled={isSubmitting || isUploadingMedia}
            style={[styles.attachButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={8}
          >
            {isUploadingMedia ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="attach-file" type="material" size={20} color={colors.textMuted} />
            )}
          </Pressable>
          <TextInput
            style={[
              styles.composerInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            maxLength={500}
            multiline
          />
          <Pressable
            onPress={onSubmitComment}
            disabled={!commentText.trim() || isSubmitting || isUploadingMedia}
            style={[
              styles.sendButton,
              { backgroundColor: commentText.trim() ? colors.primary : colors.surface },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon
                name="send"
                type="material"
                size={20}
                color={commentText.trim() ? '#FFFFFF' : colors.textMuted}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <Button
            title="Share"
            onPress={onShare}
            buttonStyle={[styles.actionButton, { backgroundColor: colors.surface }]}
            titleStyle={[styles.actionButtonText, { color: colors.text }]}
            icon={<Icon name="share" type="material" size={20} color={colors.text} style={{ marginRight: 8 }} />}
          />
          <Pressable onPress={onDirections} style={{ flex: 1 }}>
            <LinearGradient
              colors={typeConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.directionsButton}
            >
              <Icon name="navigation" type="material" size={20} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
