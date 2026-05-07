export const BLOSSOM_KIND_SERVER_LIST = 10063 as const;

export const DEFAULT_BLOSSOM_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const DEFAULT_BLOSSOM_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type BlossomServerSource = 'app-default' | 'user-kind-10063';

export type BlossomServer = {
  url: string;
  source: BlossomServerSource;
};

export type BlossomConfigInput = Record<string, unknown>;

export type BlossomConfig = {
  appUploadServers: string[];
  imageMimeTypes: string[];
  videoEnabled: boolean;
  videoMimeTypes: string[];
  maxBytes: number | null;
  useMediaEndpoint: boolean;
  mirrorEnabled: boolean;
};

export type BlossomUploadCapabilityInput = {
  acceptedMimeTypes?: unknown;
  maxBytes?: unknown;
};

export type BlossomCapabilityState =
  | {
      status: 'ready';
      config: BlossomConfig;
      uploadServers: BlossomServer[];
      allowedMimeTypes: string[];
      imageUploadEnabled: true;
      videoUploadEnabled: boolean;
      maxBytes: number | null;
      useMediaEndpoint: boolean;
      mirrorEnabled: boolean;
    }
  | {
      status: 'missing-upload-server';
      config: BlossomConfig;
      uploadServers: [];
      allowedMimeTypes: string[];
      imageUploadEnabled: false;
      videoUploadEnabled: boolean;
      maxBytes: number | null;
      useMediaEndpoint: boolean;
      mirrorEnabled: boolean;
    };

export type PickedMediaForBlossom = {
  mimeType?: string | null;
  fileSize?: number | null;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo' | string | null;
};

export type BlossomMediaRejectionReason =
  | 'missing-upload-server'
  | 'missing-mime-type'
  | 'unsupported-media-kind'
  | 'video-disabled'
  | 'mime-type-not-allowed'
  | 'file-too-large';

export type BlossomMediaAllowance =
  | {
      allowed: true;
      mediaKind: 'image' | 'video';
      mimeType: string;
      uploadServers: BlossomServer[];
    }
  | {
      allowed: false;
      reason: BlossomMediaRejectionReason;
      mediaKind: 'image' | 'video' | 'unsupported' | 'unknown';
      mimeType: string | null;
      message: string;
    };

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);

function getString(input: BlossomConfigInput, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function splitListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitListValue(item));
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => splitListValue(item));
      }
    } catch {
      // Fall back to delimiter parsing below.
    }
  }

  return trimmed
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeBlossomServerUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    return normalizedPath ? `${parsed.origin}${normalizedPath}` : parsed.origin;
  } catch {
    return null;
  }
}

export function normalizeBlossomServerUrls(value: unknown): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const item of splitListValue(value)) {
    const normalized = normalizeBlossomServerUrl(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

export function normalizeMimeTypes(value: unknown, defaults: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const values = splitListValue(value);
  const source = values.length > 0 ? values : [...defaults];
  const mimeTypes: string[] = [];

  for (const item of source) {
    const normalized = item.trim().toLowerCase();
    if (!/^[a-z0-9.+-]+\/[a-z0-9.+*-]+$/.test(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    mimeTypes.push(normalized);
  }

  return mimeTypes;
}

export function parseBlossomBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

export function parseBlossomPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function buildBlossomConfig(input: BlossomConfigInput = {}): BlossomConfig {
  const appServersValue =
    getString(input, ['EVENTINEL_BLOSSOM_SERVERS', 'EXPO_PUBLIC_EVENTINEL_BLOSSOM_SERVERS']) ?? [];

  return {
    appUploadServers: normalizeBlossomServerUrls(appServersValue),
    imageMimeTypes: normalizeMimeTypes(input.EVENTINEL_BLOSSOM_IMAGE_MIME_TYPES, DEFAULT_BLOSSOM_IMAGE_MIME_TYPES),
    videoEnabled: parseBlossomBoolean(input.EVENTINEL_BLOSSOM_VIDEO_ENABLED, false),
    videoMimeTypes: normalizeMimeTypes(input.EVENTINEL_BLOSSOM_VIDEO_MIME_TYPES, DEFAULT_BLOSSOM_VIDEO_MIME_TYPES),
    maxBytes: parseBlossomPositiveNumber(input.EVENTINEL_BLOSSOM_MAX_BYTES),
    useMediaEndpoint: parseBlossomBoolean(input.EVENTINEL_BLOSSOM_USE_MEDIA_ENDPOINT, false),
    mirrorEnabled: parseBlossomBoolean(input.EVENTINEL_BLOSSOM_MIRROR_ENABLED, false),
  };
}

export function normalizeKind10063ServerTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const tag of tags) {
    if (!Array.isArray(tag) || tag[0] !== 'server') continue;
    const normalized = normalizeBlossomServerUrl(tag[1]);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

export function buildBlossomCapabilityState(
  config: BlossomConfig,
  userKind10063Servers: string[] = [],
  serverCapabilities: BlossomUploadCapabilityInput = {}
): BlossomCapabilityState {
  const normalizedUserServers = normalizeBlossomServerUrls(userKind10063Servers);
  const uploadServers: BlossomServer[] = [
    ...normalizedUserServers.map((url) => ({ url, source: 'user-kind-10063' as const })),
    ...config.appUploadServers
      .filter((url) => !normalizedUserServers.includes(url))
      .map((url) => ({ url, source: 'app-default' as const })),
  ];
  const configuredMimeTypes = config.videoEnabled
    ? [...config.imageMimeTypes, ...config.videoMimeTypes]
    : [...config.imageMimeTypes];
  const serverMimeTypes = normalizeMimeTypes(serverCapabilities.acceptedMimeTypes);
  const allowedMimeTypes =
    serverMimeTypes.length > 0
      ? configuredMimeTypes.filter((mimeType) =>
          serverMimeTypes.some((serverMimeType) => serverMimeTypeMatchesConfiguredMimeType(serverMimeType, mimeType))
        )
      : configuredMimeTypes;
  const serverMaxBytes = parseBlossomPositiveNumber(serverCapabilities.maxBytes);
  const maxBytes =
    config.maxBytes !== null && serverMaxBytes !== null
      ? Math.min(config.maxBytes, serverMaxBytes)
      : config.maxBytes ?? serverMaxBytes;
  const videoUploadEnabled = config.videoEnabled && allowedMimeTypes.some((mimeType) => mimeType.startsWith('video/'));

  const base = {
    config,
    allowedMimeTypes,
    videoUploadEnabled,
    maxBytes,
    useMediaEndpoint: config.useMediaEndpoint,
    mirrorEnabled: config.mirrorEnabled,
  };

  if (uploadServers.length === 0) {
    return {
      ...base,
      status: 'missing-upload-server',
      uploadServers: [],
      imageUploadEnabled: false,
    };
  }

  return {
    ...base,
    status: 'ready',
    uploadServers,
    imageUploadEnabled: true,
  };
}

function serverMimeTypeMatchesConfiguredMimeType(serverMimeType: string, configuredMimeType: string): boolean {
  if (serverMimeType === configuredMimeType) return true;

  const [serverType, serverSubtype] = serverMimeType.split('/');
  if (serverSubtype !== '*') return false;

  const [configuredType, configuredSubtype] = configuredMimeType.split('/');
  return configuredSubtype !== '*' && configuredType === serverType;
}

function inferMediaKind(media: PickedMediaForBlossom): 'image' | 'video' | 'unsupported' | 'unknown' {
  if (media.type === 'image' || media.type === 'video') return media.type;
  if (typeof media.mimeType === 'string') {
    if (media.mimeType.toLowerCase().startsWith('image/')) return 'image';
    if (media.mimeType.toLowerCase().startsWith('video/')) return 'video';
  }
  if (media.type) return 'unsupported';
  return 'unknown';
}

export function classifyBlossomMediaAllowance(
  media: PickedMediaForBlossom,
  capability: BlossomCapabilityState
): BlossomMediaAllowance {
  const mediaKind = inferMediaKind(media);
  const mimeType = typeof media.mimeType === 'string' ? media.mimeType.trim().toLowerCase() : null;

  if (capability.status === 'missing-upload-server') {
    return {
      allowed: false,
      reason: 'missing-upload-server',
      mediaKind,
      mimeType,
      message: 'No Blossom upload server is configured or available from kind:10063 server lists.',
    };
  }

  if (mediaKind !== 'image' && mediaKind !== 'video') {
    return {
      allowed: false,
      reason: 'unsupported-media-kind',
      mediaKind,
      mimeType,
      message: 'Only image uploads are enabled by default; videos must be explicitly capability-gated.',
    };
  }

  if (!mimeType) {
    return {
      allowed: false,
      reason: 'missing-mime-type',
      mediaKind,
      mimeType,
      message: 'Selected media is missing a MIME type.',
    };
  }

  if (mediaKind === 'video' && !capability.videoUploadEnabled) {
    return {
      allowed: false,
      reason: 'video-disabled',
      mediaKind,
      mimeType,
      message: 'Video upload is disabled until Blossom server capabilities allow it.',
    };
  }

  if (!capability.allowedMimeTypes.includes(mimeType)) {
    return {
      allowed: false,
      reason: 'mime-type-not-allowed',
      mediaKind,
      mimeType,
      message: `${mimeType} is not allowed by Blossom media configuration.`,
    };
  }

  if (
    typeof media.fileSize === 'number' &&
    capability.maxBytes !== null &&
    media.fileSize > capability.maxBytes
  ) {
    return {
      allowed: false,
      reason: 'file-too-large',
      mediaKind,
      mimeType,
      message: `Selected media exceeds the Blossom upload size limit of ${capability.maxBytes} bytes.`,
    };
  }

  return {
    allowed: true,
    mediaKind,
    mimeType,
    uploadServers: capability.uploadServers,
  };
}
