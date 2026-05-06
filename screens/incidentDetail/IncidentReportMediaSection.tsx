import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';

import {
  resolveBlossomDisplayUrl,
  type BlossomMediaDescriptor,
} from '@lib/media/blossomRender';

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
            <ReportMediaImage key={media.id} colors={colors} media={media} />
          ) : (
            <ReportMediaPlaceholder key={media.id} colors={colors} media={media} />
          )
        )}
      </View>
    </View>
  );
}

type ReportMediaImageProps = {
  colors: ThemeColors;
  media: BlossomMediaDescriptor;
};

function ReportMediaImage({ colors, media }: ReportMediaImageProps) {
  const candidateUrls = useMemo(() => buildDisplayCandidateUrls(media), [media]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidateUrls]);

  const uri = candidateUrls[candidateIndex];
  if (!uri) {
    return <ReportMediaPlaceholder colors={colors} media={media} loadFailed />;
  }

  return (
    <Image
      testID="incident-report-media-image"
      source={{ uri }}
      style={[styles.mediaImage, { backgroundColor: colors.surface, borderColor: colors.border }]}
      resizeMode="contain"
      accessibilityLabel="Report media image"
      onError={() => {
        setCandidateIndex((current) => current + 1);
      }}
    />
  );
}

type ReportMediaPlaceholderProps = {
  colors: ThemeColors;
  media: BlossomMediaDescriptor;
  loadFailed?: boolean;
};

function ReportMediaPlaceholder({ colors, media, loadFailed = false }: ReportMediaPlaceholderProps) {
  return (
    <View
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
          {buildPlaceholderText(media, loadFailed)}
        </Text>
      </View>
    </View>
  );
}

function buildDisplayCandidateUrls(media: BlossomMediaDescriptor): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const url of [media.url, ...media.fallbackUrls]) {
    const displayUrl = resolveBlossomDisplayUrl(url, { platform: Platform.OS });
    if (!displayUrl || seen.has(displayUrl)) continue;
    seen.add(displayUrl);
    urls.push(displayUrl);
  }

  return urls;
}

function buildPlaceholderText(media: BlossomMediaDescriptor, loadFailed = false): string {
  if (loadFailed) {
    return 'Image could not be loaded from the Blossom server.';
  }

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
