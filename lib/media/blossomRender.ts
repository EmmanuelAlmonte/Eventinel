import { Buffer } from 'buffer';

import { normalizeBlossomServerUrls } from './blossomConfig';

export type BlossomRenderSource = 'imeta' | 'tags' | 'content-url';
export type BlossomRenderKind = 'image' | 'video' | 'link';
export type BlossomRenderStatus = 'renderable' | 'blocked' | 'invalid';

export type BlossomRenderReason =
  | 'invalid-url'
  | 'missing-mime-type'
  | 'unsupported-mime-type'
  | 'video-unsupported';

export type BlossomMediaDescriptor = {
  id: string;
  url: string;
  sha256?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  source: BlossomRenderSource;
  renderKind: BlossomRenderKind;
  status: BlossomRenderStatus;
  reason?: BlossomRenderReason;
  fallbackUrls: string[];
};

export type BlossomHashFromUrl = {
  sha256: string;
  extension: string | null;
};

export type BuildBlossomFallbackUrlsParams = {
  serverUrls: readonly string[];
  sha256: string;
  extension?: string | null;
  originalUrl?: string | null;
};

export type ParseBlossomMediaFromEventParams = {
  content?: string | null;
  tags?: readonly (readonly string[])[];
  authorBlossomServerUrls?: readonly string[];
};

export type BlossomSha256Digest = (bytes: Uint8Array) => Promise<string>;
export type BlossomFetchBytes = (url: string, signal?: AbortSignal) => Promise<Uint8Array>;

export type BlossomSha256VerificationResult =
  | {
      ok: true;
      sha256: string;
    }
  | {
      ok: false;
      reason: 'invalid-expected-sha256' | 'invalid-digest' | 'sha256-mismatch' | 'digest-failed';
      expectedSha256: string;
      actualSha256?: string;
      message?: string;
    };

export type FetchBlossomMediaAttempt = {
  url: string;
  reason: 'invalid-url' | 'fetch-failed' | 'invalid-digest' | 'sha256-mismatch' | 'digest-failed';
  actualSha256?: string;
  message?: string;
};

export type FetchAndVerifyBlossomMediaParams = {
  url?: string | null;
  fallbackUrls?: readonly string[];
  candidateUrls?: readonly string[];
  expectedSha256: string;
  mimeType?: string | null;
  fetchBytes?: BlossomFetchBytes;
  digest?: BlossomSha256Digest;
  signal?: AbortSignal;
};

export type FetchAndVerifyBlossomMediaResult =
  | {
      ok: true;
      url: string;
      sha256: string;
      mimeType: string;
      dataUri: string;
      attemptedUrls: string[];
    }
  | {
      ok: false;
      reason: 'invalid-expected-sha256' | 'no-candidate-urls' | 'all-candidates-failed';
      attemptedUrls: string[];
      attempts: FetchBlossomMediaAttempt[];
      message: string;
    };

export type ResolveBlossomDisplayUrlOptions = {
  platform?: string;
  androidLoopbackHost?: string;
};

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

const SHA256_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
const HASH_PATH_PATTERN = /(?:^|\/)([0-9a-fA-F]{64})(?:\.([A-Za-z0-9]+))?$/;
const MIME_PATTERN = /^[a-z0-9.+-]+\/[a-z0-9.+*-]+$/;
const CONTENT_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

const MIME_BY_EXTENSION: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  png: 'image/png',
  webm: 'video/webm',
  webp: 'image/webp',
};

export function isSha256Hex(value: string): boolean {
  return SHA256_HEX_PATTERN.test(value);
}

export function extractBlossomHashFromUrl(url: string): BlossomHashFromUrl | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;

  const path = parsed.pathname.replace(/\/+$/, '');
  const match = path.match(HASH_PATH_PATTERN);
  if (!match) return null;

  return {
    sha256: match[1].toLowerCase(),
    extension: normalizeExtension(match[2]),
  };
}

export function buildBlossomFallbackUrls(params: BuildBlossomFallbackUrlsParams): string[] {
  const sha256 = normalizeSha256(params.sha256);
  if (!sha256) return [];

  const extension =
    normalizeExtension(params.extension) ??
    (params.originalUrl ? extractExtensionFromUrl(params.originalUrl) : null);
  const suffix = extension ? `.${extension}` : '';
  const originalKey = params.originalUrl ? buildUrlResourceKey(params.originalUrl) : null;
  const seen = new Set<string>();
  const fallbackUrls: string[] = [];

  for (const serverUrl of normalizeBlossomServerUrls([...params.serverUrls])) {
    const candidate = `${serverUrl}/${sha256}${suffix}`;
    const candidateKey = buildUrlResourceKey(candidate);
    if (!candidateKey || candidateKey === originalKey || seen.has(candidateKey)) continue;
    seen.add(candidateKey);
    fallbackUrls.push(candidate);
  }

  return fallbackUrls;
}

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

export function resolveBlossomDisplayUrl(
  url: string,
  options: ResolveBlossomDisplayUrlOptions = {}
): string {
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return url;

  if (options.platform !== 'android') return normalized;

  const parsed = parseHttpUrl(normalized);
  if (!parsed) return normalized;

  if (isLoopbackHost(parsed.hostname)) {
    parsed.hostname = options.androidLoopbackHost ?? '10.0.2.2';
  }

  return parsed.href;
}

export async function verifyBlossomBytesSha256(
  bytes: Uint8Array,
  expectedSha256: string,
  digest: BlossomSha256Digest = sha256HexWithExpoCrypto
): Promise<BlossomSha256VerificationResult> {
  const normalizedExpected = normalizeSha256(expectedSha256);
  if (!normalizedExpected) {
    return {
      ok: false,
      reason: 'invalid-expected-sha256',
      expectedSha256,
      message: 'Expected SHA-256 must be a 64-character hex string.',
    };
  }

  let actualSha256: string;
  try {
    actualSha256 = (await digest(bytes)).trim().toLowerCase();
  } catch (error) {
    return {
      ok: false,
      reason: 'digest-failed',
      expectedSha256: normalizedExpected,
      message: messageFromUnknown(error, 'Failed to compute SHA-256 digest.'),
    };
  }

  if (!isSha256Hex(actualSha256)) {
    return {
      ok: false,
      reason: 'invalid-digest',
      expectedSha256: normalizedExpected,
      actualSha256,
      message: 'Digest helper returned an invalid SHA-256 value.',
    };
  }

  if (actualSha256 !== normalizedExpected) {
    return {
      ok: false,
      reason: 'sha256-mismatch',
      expectedSha256: normalizedExpected,
      actualSha256,
      message: 'Downloaded bytes did not match the expected SHA-256 hash.',
    };
  }

  return {
    ok: true,
    sha256: normalizedExpected,
  };
}

export async function fetchAndVerifyBlossomMedia(
  params: FetchAndVerifyBlossomMediaParams
): Promise<FetchAndVerifyBlossomMediaResult> {
  const expectedSha256 = normalizeSha256(params.expectedSha256);
  if (!expectedSha256) {
    return {
      ok: false,
      reason: 'invalid-expected-sha256',
      attemptedUrls: [],
      attempts: [],
      message: 'Expected SHA-256 must be a 64-character hex string.',
    };
  }

  const candidateUrls = normalizeCandidateUrls([
    ...(params.candidateUrls ?? []),
    ...(params.url ? [params.url] : []),
    ...(params.fallbackUrls ?? []),
  ]);

  if (candidateUrls.length === 0) {
    return {
      ok: false,
      reason: 'no-candidate-urls',
      attemptedUrls: [],
      attempts: [],
      message: 'No valid HTTP(S) Blossom media URLs were available.',
    };
  }

  const fetchBytes = params.fetchBytes ?? fetchBytesWithGlobalFetch;
  const mimeType = normalizeMimeType(params.mimeType) ?? 'application/octet-stream';
  const attempts: FetchBlossomMediaAttempt[] = [];

  for (const url of candidateUrls) {
    let bytes: Uint8Array;
    try {
      bytes = await fetchBytes(url, params.signal);
    } catch (error) {
      attempts.push({
        url,
        reason: 'fetch-failed',
        message: messageFromUnknown(error, 'Failed to fetch Blossom media bytes.'),
      });
      continue;
    }

    const verification = await verifyBlossomBytesSha256(bytes, expectedSha256, params.digest);
    if (verification.ok) {
      return {
        ok: true,
        url,
        sha256: verification.sha256,
        mimeType,
        dataUri: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
        attemptedUrls: [...candidateUrls.slice(0, attempts.length), url],
      };
    }

    attempts.push({
      url,
      reason:
        verification.reason === 'sha256-mismatch'
          ? 'sha256-mismatch'
          : verification.reason === 'invalid-digest'
            ? 'invalid-digest'
            : 'digest-failed',
      actualSha256: verification.actualSha256,
      message: verification.message,
    });
  }

  return {
    ok: false,
    reason: 'all-candidates-failed',
    attemptedUrls: candidateUrls,
    attempts,
    message: 'No Blossom media candidate matched the expected SHA-256 hash.',
  };
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

  for (const tag of tags) {
    const name = tag[0];
    const value = tag[1];
    if (typeof value !== 'string') continue;

    if (name === 'r') {
      current = {
        url: value,
        source: 'tags',
      };
      candidates.push(current);
      continue;
    }

    if (!current) continue;

    if (name === 'x' && !current.sha256) current.sha256 = value;
    if (name === 'm' && !current.mimeType) current.mimeType = value;
    if (name === 'size' && current.size === undefined) current.size = value;
    if (name === 'dim' && !current.dim) current.dim = value;
  }

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

function normalizeCandidateUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const url of urls) {
    const parsed = normalizeHttpUrl(url);
    if (!parsed) continue;

    const key = buildUrlComparisonKey(parsed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(parsed);
  }

  return normalized;
}

function normalizeHttpUrl(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  parsed.hash = '';
  return parsed.href;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('127.')
  );
}

function parseHttpUrl(url: string): URL | null {
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildUrlComparisonKey(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  parsed.hash = '';
  return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
}

function buildUrlResourceKey(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  return `${parsed.origin}${parsed.pathname}`.toLowerCase();
}

function normalizeSha256(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return isSha256Hex(trimmed) ? trimmed.toLowerCase() : null;
}

function normalizeMimeType(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return MIME_PATTERN.test(normalized) ? normalized : null;
}

function normalizeExtension(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/^\./, '').toLowerCase();
  return /^[a-z0-9]{1,16}$/.test(normalized) ? normalized : null;
}

function extractExtensionFromUrl(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;

  const path = parsed.pathname.replace(/\/+$/, '');
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === lastSegment.length - 1) return null;
  return normalizeExtension(lastSegment.slice(dotIndex + 1));
}

function inferMimeTypeFromExtension(extension: string | null): string | null {
  return extension ? MIME_BY_EXTENSION[extension] ?? null : null;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function parseDimensions(value: unknown): { width?: number; height?: number } {
  if (typeof value !== 'string') return {};

  const match = value.trim().match(/^(\d+)x(\d+)$/i);
  if (!match) return {};

  const width = normalizePositiveInteger(match[1]);
  const height = normalizePositiveInteger(match[2]);
  return width && height ? { width, height } : {};
}

function buildDescriptorId(
  source: BlossomRenderSource,
  sha256: string | undefined,
  url: string,
  index: number
): string {
  return `${source}:${sha256 ?? url}:${index}`;
}

function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[),.;!?]+$/g, '');
}

function dedupeStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function pickDefined<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : { [key]: value } as { [P in K]?: V };
}

async function sha256HexWithExpoCrypto(bytes: Uint8Array): Promise<string> {
  const Crypto = await import('expo-crypto');
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return arrayBufferToHex(digest);
}

async function fetchBytesWithGlobalFetch(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  if (typeof fetch !== 'function') {
    throw new Error('No fetch implementation is available for Blossom media retrieval.');
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Blossom media fetch failed with HTTP ${response.status}.`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function messageFromUnknown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
