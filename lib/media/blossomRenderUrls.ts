import { normalizeBlossomServerUrls } from './blossomConfig';
import type {
  BlossomHashFromUrl,
  BuildBlossomFallbackUrlsParams,
  BlossomRenderSource,
  ResolveBlossomDisplayUrlOptions,
} from './blossomRenderTypes';

const SHA256_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
const HASH_PATH_PATTERN = /(?:^|\/)([0-9a-fA-F]{64})(?:\.([A-Za-z0-9]+))?$/;
const MIME_PATTERN = /^[a-z0-9.+-]+\/[a-z0-9.+*-]+$/;

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
  const originalKey = params.originalUrl ? buildUrlComparisonKey(params.originalUrl) : null;
  const seen = new Set<string>();
  const fallbackUrls: string[] = [];

  for (const serverUrl of normalizeBlossomServerUrls([...params.serverUrls])) {
    const candidate = `${serverUrl}/${sha256}${suffix}`;
    const candidateKey = buildUrlComparisonKey(candidate);
    if (!candidateKey || candidateKey === originalKey || seen.has(candidateKey)) continue;
    seen.add(candidateKey);
    fallbackUrls.push(candidate);
  }

  return fallbackUrls;
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

export function normalizeCandidateUrls(urls: readonly string[]): string[] {
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

export function normalizeHttpUrl(url: string): string | null {
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

export function parseHttpUrl(url: string): URL | null {
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildUrlComparisonKey(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  parsed.hash = '';
  return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
}

export function normalizeSha256(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return isSha256Hex(trimmed) ? trimmed.toLowerCase() : null;
}

export function normalizeMimeType(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return MIME_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeExtension(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/^\./, '').toLowerCase();
  return /^[a-z0-9]{1,16}$/.test(normalized) ? normalized : null;
}

export function extractExtensionFromUrl(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;

  const path = parsed.pathname.replace(/\/+$/, '');
  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === lastSegment.length - 1) return null;
  return normalizeExtension(lastSegment.slice(dotIndex + 1));
}

export function inferMimeTypeFromExtension(extension: string | null): string | null {
  return extension ? MIME_BY_EXTENSION[extension] ?? null : null;
}

export function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export function parseDimensions(value: unknown): { width?: number; height?: number } {
  if (typeof value !== 'string') return {};

  const match = value.trim().match(/^(\d+)x(\d+)$/i);
  if (!match) return {};

  const width = normalizePositiveInteger(match[1]);
  const height = normalizePositiveInteger(match[2]);
  return width && height ? { width, height } : {};
}

export function buildDescriptorId(
  source: BlossomRenderSource,
  sha256: string | undefined,
  url: string,
  index: number
): string {
  return `${source}:${sha256 ?? url}:${index}`;
}

export function trimTrailingUrlPunctuation(url: string): string {
  return url.replace(/[),.;!?]+$/g, '');
}

export function dedupeStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export function pickDefined<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : { [key]: value } as { [P in K]?: V };
}
