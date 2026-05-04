import type { BlossomBlobDescriptor, BlossomUploadedMedia } from './blossomUpload';

export type BlossomMediaMetadataTag = string[];

export type BlossomMediaMetadataDescriptor = {
  url: string;
  sha256?: string | null;
  type?: string | null;
  mimeType?: string | null;
  size?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
};

export type BlossomMediaMetadataInput =
  | BlossomUploadedMedia
  | BlossomBlobDescriptor
  | BlossomMediaMetadataDescriptor;

export type BuildBlossomMediaMetadataTagsParams = {
  media: readonly BlossomMediaMetadataInput[];
};

export type NormalizedBlossomMediaMetadata = {
  url: string;
  sha256?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
};

type UnknownRecord = Record<string, unknown>;

const SHA256_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
const MIME_PATTERN = /^[a-z0-9.+-]+\/[a-z0-9.+*-]+$/;

export function buildBlossomMediaMetadataTags(
  params: BuildBlossomMediaMetadataTagsParams
): BlossomMediaMetadataTag[] {
  const seen = new Set<string>();
  const tags: BlossomMediaMetadataTag[] = [];

  for (const item of params.media) {
    const metadata = normalizeBlossomMediaMetadata(item);
    if (!metadata) continue;

    const key = buildUrlComparisonKey(metadata.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    tags.push(buildImetaTag(metadata), ...buildTopLevelTags(metadata));
  }

  return tags;
}

export function normalizeBlossomMediaMetadata(
  input: BlossomMediaMetadataInput
): NormalizedBlossomMediaMetadata | null {
  const record = input as UnknownRecord;
  const descriptor = asRecord(record.descriptor);
  const source = asRecord(record.source);
  const url = normalizeHttpUrl(readString(record.url) ?? readString(descriptor?.url));

  if (!url) return null;

  const sha256 = normalizeSha256(readString(record.sha256) ?? readString(descriptor?.sha256));
  const mimeType = normalizeMimeType(
    readString(record.mimeType) ??
      readString(record.type) ??
      readString(descriptor?.mimeType) ??
      readString(descriptor?.type)
  );
  const size = normalizePositiveInteger(record.size ?? descriptor?.size);
  const width = normalizePositiveInteger(record.width ?? source?.width);
  const height = normalizePositiveInteger(record.height ?? source?.height);

  return {
    url,
    ...(sha256 ? { sha256 } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(size ? { size } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
}

function buildImetaTag(metadata: NormalizedBlossomMediaMetadata): BlossomMediaMetadataTag {
  return ['imeta', ...buildImetaEntries(metadata)];
}

function buildImetaEntries(metadata: NormalizedBlossomMediaMetadata): string[] {
  const entries = [`url ${metadata.url}`];
  if (metadata.sha256) entries.push(`x ${metadata.sha256}`);
  if (metadata.mimeType) entries.push(`m ${metadata.mimeType}`);
  if (metadata.size) entries.push(`size ${metadata.size}`);
  if (metadata.width && metadata.height) entries.push(`dim ${metadata.width}x${metadata.height}`);
  return entries;
}

function buildTopLevelTags(metadata: NormalizedBlossomMediaMetadata): BlossomMediaMetadataTag[] {
  const tags: BlossomMediaMetadataTag[] = [['r', metadata.url]];
  if (metadata.sha256) tags.push(['x', metadata.sha256]);
  if (metadata.mimeType) tags.push(['m', metadata.mimeType]);
  if (metadata.size) tags.push(['size', String(metadata.size)]);
  if (metadata.width && metadata.height) tags.push(['dim', `${metadata.width}x${metadata.height}`]);
  return tags;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeHttpUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.href;
  } catch {
    return null;
  }
}

function buildUrlComparisonKey(value: string): string | null {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeSha256(value: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  return SHA256_HEX_PATTERN.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function normalizeMimeType(value: string | null): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  return MIME_PATTERN.test(normalized) ? normalized : undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}
