import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import type { BlossomMediaDescriptor } from '@lib/media/blossomRender';

type ThemeColors = {
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

type IncidentReportMediaSectionProps = {
  colors: ThemeColors;
  mediaAttachments?: readonly BlossomMediaDescriptor[];
};

export function IncidentReportMediaSection({
  colors,
  mediaAttachments = [],
}: IncidentReportMediaSectionProps) {
  if (mediaAttachments.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Report media</Text>
      <View style={styles.mediaList}>
        {mediaAttachments.map((media) =>
          media.status === 'renderable' && media.renderKind === 'image' ? (
            <Image
              key={media.id}
              testID="incident-report-media-image"
              source={{ uri: media.url }}
              style={[styles.mediaImage, { backgroundColor: colors.surface, borderColor: colors.border }]}
              resizeMode="cover"
              accessibilityLabel="Report media image"
            />
          ) : (
            <View
              key={media.id}
              testID="incident-report-media-placeholder"
              style={[styles.mediaPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View
                style={[
                  styles.placeholderGlyph,
                  { backgroundColor: media.renderKind === 'video' ? colors.warning : colors.textMuted },
                ]}
              />
              <View style={styles.placeholderCopy}>
                <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                  {media.renderKind === 'video' ? 'Video attachment' : 'Media unavailable'}
                </Text>
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  {buildPlaceholderText(media)}
                </Text>
              </View>
            </View>
          )
        )}
      </View>
    </View>
  );
}

function buildPlaceholderText(media: BlossomMediaDescriptor): string {
  if (media.renderKind === 'video') {
    return 'Video preview is not supported.';
  }

  if (media.reason === 'missing-mime-type') {
    return 'Media is missing a MIME type.';
  }

  if (media.reason === 'unsupported-mime-type') {
    return 'Media type is not supported.';
  }

  return 'Media could not be rendered.';
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 10,
  },
  mediaList: {
    gap: 10,
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaPlaceholder: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeholderCopy: {
    flex: 1,
  },
  placeholderGlyph: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  placeholderTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  placeholderText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
