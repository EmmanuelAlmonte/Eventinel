import type {
  BlossomMediaDescriptor,
  BlossomRenderKind,
  BlossomRenderReason,
  BlossomRenderSource,
  BlossomRenderStatus,
  ParseBlossomMediaFromEventParams,
} from './blossomRenderTypes';
import {
  buildBlossomFallbackUrls,
  buildDescriptorId,
  buildUrlComparisonKey,
  dedupeStrings,
  extractBlossomHashFromUrl,
  extractExtensionFromUrl,
  inferMimeTypeFromExtension,
  normalizeHttpUrl,
  normalizeMimeType,
  normalizePositiveInteger,
  normalizeSha256,
  parseDimensions,
  pickDefined,
  trimTrailingUrlPunctuation,
} from './blossomRenderUrls';

type RawBlossomMediaCandidate = {
  url: string;
  sha256?: string | null;
  mimeType?: string | null;
  size?: string | number | null;
  dim?: string | null;
  source: BlossomRenderSource;
};

type RenderDecision = {
  renderKind: BlossomRenderKind;
  status: BlossomRenderStatus;
  reason?: BlossomRenderReason;
};

const CONTENT_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

export function parseBlossomMediaFromEvent(params: ParseBlossomMediaFromEventParams): BlossomMediaDescriptor[] {
  const candidates = [
    ...parseImetaCandidates(params.tags ?? []),
    ...parseTopLevelTagCandidates(params.tags ?? []),
    ...parseContentUrlCandidates(params.content ?? ''),
  ];
  const descriptors = new Map<string, BlossomMediaDescriptor>();

  candidates.forEach((candidate, index) => {
    const descriptor = buildMediaDescriptor(candidate, index, params.authorBlossomServerUrls ?? []);
    if (!descriptor) return;

    const key = buildUrlComparisonKey(descriptor.url);
    if (!key) return;

    const existing = descriptors.get(key);
    descriptors.set(key, existing ? mergeDescriptors(existing, descriptor) : descriptor);
  });

  return Array.from(descriptors.values());
}

function parseImetaCandidates(tags: readonly (readonly string[])[]): RawBlossomMediaCandidate[] {
  return tags
    .filter((tag) => tag[0] === 'imeta')
    .map((tag) => {
      const values = parseImetaEntries(tag.slice(1));
      return {
        url: values.url ?? '',
        sha256: values.x,
        mimeType: values.m,
        size: values.size,
        dim: values.dim,
        source: 'imeta' as const,
      };
    })
    .filter((candidate) => candidate.url.trim().length > 0);
}

function parseTopLevelTagCandidates(tags: readonly (readonly string[])[]): RawBlossomMediaCandidate[] {
  const candidates: RawBlossomMediaCandidate[] = [];
  let current: RawBlossomMediaCandidate | null = null;
  let hasMediaMetadata = false;

  const pushCurrent = () => {
    if (current && hasMediaMetadata) {
      candidates.push(current);
    }
    current = null;
    hasMediaMetadata = false;
  };

  for (const tag of tags) {
    const name = tag[0];
    const value = tag[1];
    if (typeof value !== 'string') continue;

    if (name === 'r') {
      pushCurrent();
      current = {
        url: value,
        source: 'tags',
      };
      continue;
    }

    if (!current) continue;

    if (name === 'x' && !current.sha256) {
      current.sha256 = value;
      hasMediaMetadata = true;
    }
    if (name === 'm' && !current.mimeType) {
      current.mimeType = value;
      hasMediaMetadata = true;
    }
    if (name === 'size' && current.size === undefined) {
      current.size = value;
      hasMediaMetadata = true;
    }
    if (name === 'dim' && !current.dim) {
      current.dim = value;
      hasMediaMetadata = true;
    }
  }

  pushCurrent();

  return candidates;
}

function parseContentUrlCandidates(content: string): RawBlossomMediaCandidate[] {
  const matches = content.match(CONTENT_URL_PATTERN) ?? [];
  return matches.map((url) => ({
    url: trimTrailingUrlPunctuation(url),
    source: 'content-url' as const,
  }));
}

function parseImetaEntries(entries: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const entry of entries) {
    const separator = entry.search(/\s/);
    if (separator <= 0) continue;

    const key = entry.slice(0, separator).trim().toLowerCase();
    const value = entry.slice(separator).trim();
    if (!key || !value || values[key]) continue;
    values[key] = value;
  }

  return values;
}

function buildMediaDescriptor(
  candidate: RawBlossomMediaCandidate,
  index: number,
  authorBlossomServerUrls: readonly string[]
): BlossomMediaDescriptor | null {
  const url = normalizeHttpUrl(candidate.url);
  if (!url) return null;

  const hashFromUrl = extractBlossomHashFromUrl(url);
  const sha256 = normalizeSha256(candidate.sha256) ?? hashFromUrl?.sha256;
  const extension = hashFromUrl?.extension ?? extractExtensionFromUrl(url);
  const mimeType = normalizeMimeType(candidate.mimeType) ?? inferMimeTypeFromExtension(extension);
  const size = normalizePositiveInteger(candidate.size);
  const dimensions = parseDimensions(candidate.dim);
  const decision = classifyRenderDecision(mimeType);

  return {
    id: buildDescriptorId(candidate.source, sha256, url, index),
    url,
    ...(sha256 ? { sha256 } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(size ? { size } : {}),
    ...(dimensions.width ? { width: dimensions.width } : {}),
    ...(dimensions.height ? { height: dimensions.height } : {}),
    source: candidate.source,
    ...decision,
    fallbackUrls: sha256
      ? buildBlossomFallbackUrls({
          serverUrls: authorBlossomServerUrls,
          sha256,
          extension,
          originalUrl: url,
        })
      : [],
  };
}

function mergeDescriptors(
  existing: BlossomMediaDescriptor,
  incoming: BlossomMediaDescriptor
): BlossomMediaDescriptor {
  const mimeType = existing.mimeType ?? incoming.mimeType;
  const decision =
    existing.status === 'renderable' || !mimeType
      ? {
          renderKind: existing.renderKind,
          status: existing.status,
          reason: existing.reason,
        }
      : classifyRenderDecision(mimeType);

  return {
    ...existing,
    ...(existing.sha256 ? {} : pickDefined('sha256', incoming.sha256)),
    ...(existing.mimeType ? {} : pickDefined('mimeType', incoming.mimeType)),
    ...(existing.size ? {} : pickDefined('size', incoming.size)),
    ...(existing.width ? {} : pickDefined('width', incoming.width)),
    ...(existing.height ? {} : pickDefined('height', incoming.height)),
    ...decision,
    fallbackUrls: dedupeStrings([...existing.fallbackUrls, ...incoming.fallbackUrls]),
  };
}

function classifyRenderDecision(mimeType: string | null): RenderDecision {
  if (!mimeType) {
    return {
      renderKind: 'link',
      status: 'blocked',
      reason: 'missing-mime-type',
    };
  }

  if (mimeType.startsWith('image/')) {
    return {
      renderKind: 'image',
      status: 'renderable',
    };
  }

  if (mimeType.startsWith('video/')) {
    return {
      renderKind: 'video',
      status: 'blocked',
      reason: 'video-unsupported',
    };
  }

  return {
    renderKind: 'link',
    status: 'blocked',
    reason: 'unsupported-mime-type',
  };
}
