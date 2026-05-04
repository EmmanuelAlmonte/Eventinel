import type { ReportMediaAttachment } from '../../contexts/ReportDraftContext';

export function buildReportMediaAttachmentCountLabel(
  attachments: readonly ReportMediaAttachment[]
): string {
  const imageCount = attachments.filter((attachment) => attachment.mediaKind === 'image').length;
  const videoCount = attachments.length - imageCount;

  if (imageCount > 0 && videoCount > 0) {
    return `${attachments.length} media attached`;
  }

  if (videoCount > 0) {
    return videoCount === 1 ? '1 video attached' : `${videoCount} videos attached`;
  }

  return imageCount === 1 ? '1 image attached' : `${imageCount} images attached`;
}

export function buildReportMediaAttachmentMeta(attachment: ReportMediaAttachment): string {
  const parts = [
    attachment.mimeType,
    attachment.size ? formatReportMediaBytes(attachment.size) : null,
    attachment.width && attachment.height ? `${attachment.width}x${attachment.height}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' - ') : attachment.url;
}

export function getReportMediaAttachmentTitle(attachment: ReportMediaAttachment): string {
  return attachment.mediaKind === 'video' ? 'Video attachment' : 'Image attachment';
}

function formatReportMediaBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}
