import { Buffer } from 'buffer';

import {
  classifyBlossomMediaAllowance,
  type BlossomCapabilityState,
  type BlossomMediaRejectionReason,
  type BlossomServer,
} from './blossomConfig';
import type { PickedMedia } from './pickMedia';

export const BLOSSOM_UPLOAD_AUTH_KIND = 24242 as const;

const DEFAULT_AUTH_EXPIRATION_SECONDS = 5 * 60;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_POLICY = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5_000,
  multiplier: 2,
};

type JsonRecord = Record<string, unknown>;

export type BlossomUploadMedia = PickedMedia;

export type BlossomUploadAuthVerb = 'upload' | 'media';

export type BlossomUnsignedAuthEvent = {
  kind: typeof BLOSSOM_UPLOAD_AUTH_KIND;
  content: string;
  created_at: number;
  tags: string[][];
};

export type BlossomSignedAuthEvent = BlossomUnsignedAuthEvent & {
  id?: string;
  pubkey?: string;
  sig?: string;
  [key: string]: unknown;
};

export type BlossomAuthSigner = (event: BlossomUnsignedAuthEvent) => Promise<BlossomSignedAuthEvent>;

export type BlossomReadFileBytes = (fileUri: string) => Promise<Uint8Array>;

export type BlossomSha256Digest = (bytes: Uint8Array) => Promise<string>;

export type BlossomRetryPolicy = {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
};

export type BlossomUploadProgress = {
  stage: 'uploading';
  attempt: number;
  loadedBytes: number;
  totalBytes: number | null;
  fraction: number | null;
};

export type BlossomUploadTransportProgress = {
  loadedBytes: number;
  totalBytes?: number | null;
};

export type BlossomUploadTransportRequest = {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  body: Uint8Array;
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: BlossomUploadTransportProgress) => void;
};

export type BlossomUploadTransportResponse = {
  status: number;
  headers?: Record<string, string> | Headers | null;
  body?: unknown;
};

export type BlossomUploadTransport = (
  request: BlossomUploadTransportRequest
) => Promise<BlossomUploadTransportResponse>;

export type BlossomBlobDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  nip94?: unknown;
};

export type BlossomUploadedMedia = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  server: BlossomServer;
  sourceServerUrl: string;
  endpoint: '/upload' | '/media';
  mediaKind: 'image' | 'video';
  source: {
    uri: string;
    fileName?: string;
    width?: number;
    height?: number;
    duration?: number;
  };
  descriptor: BlossomBlobDescriptor;
};

export type BlossomUploadValidationError = {
  type: 'validation';
  reason: BlossomMediaRejectionReason;
  message: string;
  retryable: false;
};

export type BlossomUploadAuthMissingError = {
  type: 'auth-missing';
  message: string;
  retryable: false;
};

export type BlossomUploadAuthFailedError = {
  type: 'auth-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadServerRejectedError = {
  type: 'server-rejected';
  status: number;
  message: string;
  reason: string | null;
  body: string | null;
  retryable: boolean;
};

export type BlossomUploadNetworkError = {
  type: 'network';
  message: string;
  retryable: true;
};

export type BlossomUploadTimeoutError = {
  type: 'timeout';
  message: string;
  retryable: true;
};

export type BlossomUploadRetryExhaustedError = {
  type: 'retry-exhausted';
  message: string;
  attempts: number;
  lastError:
    | BlossomUploadNetworkError
    | BlossomUploadTimeoutError
    | BlossomUploadServerRejectedError;
  retryable: false;
};

export type BlossomUploadCancelledError = {
  type: 'cancelled';
  message: string;
  retryable: false;
};

export type BlossomUploadReadFailedError = {
  type: 'file-read-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadHashFailedError = {
  type: 'hash-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadInvalidResponseError = {
  type: 'invalid-response';
  status: number;
  message: string;
  body: string | null;
  retryable: false;
};

export type BlossomUploadError =
  | BlossomUploadValidationError
  | BlossomUploadAuthMissingError
  | BlossomUploadAuthFailedError
  | BlossomUploadServerRejectedError
  | BlossomUploadNetworkError
  | BlossomUploadTimeoutError
  | BlossomUploadRetryExhaustedError
  | BlossomUploadCancelledError
  | BlossomUploadReadFailedError
  | BlossomUploadHashFailedError
  | BlossomUploadInvalidResponseError;

export type BlossomUploadOutcome =
  | {
      ok: true;
      result: BlossomUploadedMedia;
    }
  | {
      ok: false;
      error: BlossomUploadError;
    };

export type BlossomUploadParams = {
  media: BlossomUploadMedia;
  capability: BlossomCapabilityState;
  server?: BlossomServer;
  signal?: AbortSignal;
  onProgress?: (progress: BlossomUploadProgress) => void;
  signer?: BlossomAuthSigner;
  readFileBytes?: BlossomReadFileBytes;
  sha256Digest?: BlossomSha256Digest;
  transport?: BlossomUploadTransport;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  retry?: BlossomRetryPolicy;
  timeoutMs?: number;
  authExpirationSeconds?: number;
};

class BlossomDefaultAuthMissing extends Error {}

class BlossomTransportFailure extends Error {
  constructor(
    readonly failureType: 'network' | 'timeout' | 'cancelled',
    message: string
  ) {
    super(message);
  }
}

export function resolveBlossomUploadEndpoint(capability: BlossomCapabilityState): '/upload' | '/media' {
  return capability.useMediaEndpoint ? '/media' : '/upload';
}

export function resolveBlossomAuthVerb(endpoint: '/upload' | '/media'): BlossomUploadAuthVerb {
  return endpoint === '/media' ? 'media' : 'upload';
}

export function resolveBlossomServerAuthTag(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname.toLowerCase();
  } catch {
    return serverUrl.trim().split(':')[0].toLowerCase();
  }
}

export function buildBlossomUploadUrl(serverUrl: string, endpoint: '/upload' | '/media'): string {
  const parsed = new URL(serverUrl);
  return `${parsed.origin}${endpoint}`;
}

export function buildBlossomAuthEventTemplate(params: {
  authVerb: BlossomUploadAuthVerb;
  sha256: string;
  serverUrl: string;
  nowUnixSeconds: number;
  expirationSeconds?: number;
}): BlossomUnsignedAuthEvent {
  const expirationSeconds = params.expirationSeconds ?? DEFAULT_AUTH_EXPIRATION_SECONDS;
  return {
    kind: BLOSSOM_UPLOAD_AUTH_KIND,
    content: `Authorize Blossom ${params.authVerb}`,
    created_at: params.nowUnixSeconds,
    tags: [
      ['t', params.authVerb],
      ['expiration', String(params.nowUnixSeconds + expirationSeconds)],
      ['x', params.sha256],
      ['server', resolveBlossomServerAuthTag(params.serverUrl)],
    ],
  };
}

export function encodeBlossomAuthHeader(event: BlossomSignedAuthEvent): string {
  const payload = Buffer.from(JSON.stringify(event), 'utf8').toString('base64');
  const base64url = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `Nostr ${base64url}`;
}

export async function uploadToBlossom(params: BlossomUploadParams): Promise<BlossomUploadOutcome> {
  const signal = params.signal;
  if (signal?.aborted) return { ok: false, error: cancelledError() };

  const allowance = classifyBlossomMediaAllowance(params.media, params.capability);
  if (!allowance.allowed) {
    return {
      ok: false,
      error: {
        type: 'validation',
        reason: allowance.reason,
        message: allowance.message,
        retryable: false,
      },
    };
  }

  const server = params.server ?? allowance.uploadServers[0];
  if (!server) {
    return {
      ok: false,
      error: {
        type: 'validation',
        reason: 'missing-upload-server',
        message: 'No Blossom upload server is configured or available from kind:10063 server lists.',
        retryable: false,
      },
    };
  }

  const readFileBytes = params.readFileBytes ?? readFileBytesWithExpoFileSystem;
  const sha256Digest = params.sha256Digest ?? sha256HexWithExpoCrypto;
  const transport = params.transport ?? uploadWithXmlHttpRequest;
  const sleep = params.sleep ?? sleepWithAbort;
  const now = params.now ?? (() => Date.now());
  const retry = normalizeRetryPolicy(params.retry);
  const endpoint = resolveBlossomUploadEndpoint(params.capability);
  const authVerb = resolveBlossomAuthVerb(endpoint);
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let bytes: Uint8Array;
  try {
    bytes = await readFileBytes(params.media.uri);
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'file-read-failed',
        message: messageFromUnknown(error, 'Failed to read selected media file'),
        retryable: false,
      },
    };
  }

  if (signal?.aborted) return { ok: false, error: cancelledError() };

  if (params.capability.maxBytes !== null && bytes.byteLength > params.capability.maxBytes) {
    return {
      ok: false,
      error: {
        type: 'validation',
        reason: 'file-too-large',
        message: `Selected media exceeds the Blossom upload size limit of ${params.capability.maxBytes} bytes.`,
        retryable: false,
      },
    };
  }

  let sha256: string;
  try {
    sha256 = normalizeSha256(await sha256Digest(bytes));
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'hash-failed',
        message: messageFromUnknown(error, 'Failed to hash selected media file'),
        retryable: false,
      },
    };
  }

  if (signal?.aborted) return { ok: false, error: cancelledError() };

  let authHeader: string;
  try {
    const authTemplate = buildBlossomAuthEventTemplate({
      authVerb,
      sha256,
      serverUrl: server.url,
      nowUnixSeconds: Math.floor(now() / 1000),
      expirationSeconds: params.authExpirationSeconds,
    });
    const signed = await (params.signer ?? signWithDefaultNdkSigner)(authTemplate);
    authHeader = encodeBlossomAuthHeader(signed);
  } catch (error) {
    if (error instanceof BlossomDefaultAuthMissing) {
      return {
        ok: false,
        error: {
          type: 'auth-missing',
          message: error.message,
          retryable: false,
        },
      };
    }

    return {
      ok: false,
      error: {
        type: 'auth-failed',
        message: messageFromUnknown(error, 'Failed to sign Blossom upload authorization'),
        retryable: false,
      },
    };
  }

  if (signal?.aborted) return { ok: false, error: cancelledError() };

  const requestBase = {
    method: 'PUT' as const,
    url: buildBlossomUploadUrl(server.url, endpoint),
    headers: {
      Authorization: authHeader,
      'Content-Type': allowance.mimeType,
      'Content-Length': String(bytes.byteLength),
      'X-SHA-256': sha256,
    },
    body: bytes,
    timeoutMs,
    signal,
  };
  const maxAttempts = retry.maxRetries + 1;
  let lastTransientError:
    | BlossomUploadNetworkError
    | BlossomUploadTimeoutError
    | BlossomUploadServerRejectedError
    | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const request: BlossomUploadTransportRequest = {
      ...requestBase,
      onProgress: buildProgressReporter({
        attempt,
        totalBytes: bytes.byteLength,
        onProgress: params.onProgress,
      }),
    };

    const responseOutcome = await runTransportAttempt(transport, request, signal);
    if (!responseOutcome.ok) {
      if (responseOutcome.error.type === 'cancelled') {
        return responseOutcome;
      }

      if (!isRetryableUploadError(responseOutcome.error) || attempt >= maxAttempts) {
        if (lastTransientError && isRetryableUploadError(responseOutcome.error)) {
          return {
            ok: false,
            error: retryExhaustedError(attempt, responseOutcome.error),
          };
        }
        return responseOutcome;
      }

      lastTransientError = responseOutcome.error;
      const waitOutcome = await waitBeforeRetry(sleep, computeRetryDelayMs(retry, attempt), signal);
      if (!waitOutcome.ok) return waitOutcome;
      continue;
    }

    const normalized = normalizeTransportResponse(responseOutcome.response, {
      endpoint,
      media: params.media,
      mediaKind: allowance.mediaKind,
      server,
    });

    if (normalized.ok) return normalized;

    if (!isRetryableUploadError(normalized.error) || attempt >= maxAttempts) {
      if (lastTransientError && isRetryableUploadError(normalized.error)) {
        return {
          ok: false,
          error: retryExhaustedError(attempt, normalized.error),
        };
      }
      return normalized;
    }

    lastTransientError = normalized.error;
    const waitOutcome = await waitBeforeRetry(sleep, computeRetryDelayMs(retry, attempt), signal);
    if (!waitOutcome.ok) return waitOutcome;
  }

  return {
    ok: false,
    error: retryExhaustedError(maxAttempts, lastTransientError ?? networkError('Upload retry limit reached')),
  };
}

async function signWithDefaultNdkSigner(event: BlossomUnsignedAuthEvent): Promise<BlossomSignedAuthEvent> {
  const [{ ndk }, mobile] = await Promise.all([import('@lib/ndk'), import('@nostr-dev-kit/mobile')]);
  const signer = (ndk as { signer?: unknown }).signer as
    | {
        blockUntilReady?: () => Promise<unknown>;
        sign?: (event: unknown) => Promise<unknown>;
      }
    | undefined;

  if (!signer) {
    throw new BlossomDefaultAuthMissing('No Nostr signer is available for Blossom upload authorization.');
  }

  if (signer.blockUntilReady) await signer.blockUntilReady();

  const EventCtor = (mobile as { NDKEvent?: new (ndk: unknown) => unknown }).NDKEvent;
  if (EventCtor) {
    const authEvent = new EventCtor(ndk) as {
      kind: number;
      content: string;
      created_at: number;
      tags: string[][];
      sign?: () => Promise<void>;
      rawEvent?: () => unknown;
      id?: string;
      pubkey?: string;
      sig?: string;
    };
    authEvent.kind = event.kind;
    authEvent.content = event.content;
    authEvent.created_at = event.created_at;
    authEvent.tags = event.tags;
    await authEvent.sign?.();
    const raw = authEvent.rawEvent?.() ?? {
      ...event,
      id: authEvent.id,
      pubkey: authEvent.pubkey,
      sig: authEvent.sig,
    };
    if (isSignedAuthEvent(raw)) return raw;
  }

  if (typeof signer.sign === 'function') {
    const signed = await signer.sign(event);
    if (isSignedAuthEvent(signed)) return signed;
  }

  throw new Error('Nostr signer did not return a signed Blossom authorization event.');
}

async function readFileBytesWithExpoFileSystem(fileUri: string): Promise<Uint8Array> {
  const { File } = await import('expo-file-system');
  const file = new File(fileUri);
  return file.bytes();
}

async function sha256HexWithExpoCrypto(bytes: Uint8Array): Promise<string> {
  const Crypto = await import('expo-crypto');
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return arrayBufferToHex(digest);
}

function normalizeRetryPolicy(policy: BlossomRetryPolicy | undefined): Required<BlossomRetryPolicy> {
  return {
    maxRetries: normalizeNonNegativeInteger(policy?.maxRetries, DEFAULT_RETRY_POLICY.maxRetries),
    initialDelayMs: normalizeNonNegativeInteger(policy?.initialDelayMs, DEFAULT_RETRY_POLICY.initialDelayMs),
    maxDelayMs: normalizeNonNegativeInteger(policy?.maxDelayMs, DEFAULT_RETRY_POLICY.maxDelayMs),
    multiplier:
      typeof policy?.multiplier === 'number' && Number.isFinite(policy.multiplier) && policy.multiplier > 0
        ? policy.multiplier
        : DEFAULT_RETRY_POLICY.multiplier,
  };
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function computeRetryDelayMs(policy: Required<BlossomRetryPolicy>, attempt: number): number {
  const nextDelay = policy.initialDelayMs * policy.multiplier ** Math.max(0, attempt - 1);
  return Math.min(policy.maxDelayMs, Math.floor(nextDelay));
}

async function waitBeforeRetry(
  sleep: (delayMs: number, signal?: AbortSignal) => Promise<void>,
  delayMs: number,
  signal?: AbortSignal
): Promise<BlossomUploadOutcome | { ok: true }> {
  try {
    await sleep(delayMs, signal);
    return { ok: true };
  } catch (error) {
    if (signal?.aborted || error instanceof BlossomTransportFailure) {
      return { ok: false, error: cancelledError() };
    }
    return { ok: false, error: networkError(messageFromUnknown(error, 'Retry backoff failed')) };
  }
}

async function runTransportAttempt(
  transport: BlossomUploadTransport,
  request: BlossomUploadTransportRequest,
  signal?: AbortSignal
): Promise<
  | {
      ok: true;
      response: BlossomUploadTransportResponse;
    }
  | {
      ok: false;
      error: BlossomUploadError;
    }
> {
  if (signal?.aborted) return { ok: false, error: cancelledError() };

  try {
    const response = await raceTransportWithCancellation(transport(request), signal);
    return { ok: true, response };
  } catch (error) {
    return { ok: false, error: transportErrorFromUnknown(error, signal) };
  }
}

function raceTransportWithCancellation<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

function normalizeTransportResponse(
  response: BlossomUploadTransportResponse,
  context: {
    endpoint: '/upload' | '/media';
    media: BlossomUploadMedia;
    mediaKind: 'image' | 'video';
    server: BlossomServer;
  }
): BlossomUploadOutcome {
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, error: serverRejectedError(response) };
  }

  const body = parseResponseBody(response.body);
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      error: {
        type: 'invalid-response',
        status: response.status,
        message: 'Blossom server response was not a JSON object.',
        body: stringifyResponseBody(response.body),
        retryable: false,
      },
    };
  }

  const descriptor = coerceBlobDescriptor(body);
  if (!descriptor) {
    return {
      ok: false,
      error: {
        type: 'invalid-response',
        status: response.status,
        message: 'Blossom server response did not include a valid BlobDescriptor.',
        body: stringifyResponseBody(response.body),
        retryable: false,
      },
    };
  }

  return {
    ok: true,
    result: {
      url: descriptor.url,
      sha256: descriptor.sha256,
      size: descriptor.size,
      type: descriptor.type,
      uploaded: descriptor.uploaded,
      server: context.server,
      sourceServerUrl: context.server.url,
      endpoint: context.endpoint,
      mediaKind: context.mediaKind,
      source: {
        uri: context.media.uri,
        fileName: context.media.fileName,
        width: context.media.width,
        height: context.media.height,
        duration: context.media.duration,
      },
      descriptor,
    },
  };
}

function coerceBlobDescriptor(value: object): BlossomBlobDescriptor | null {
  const record = value as JsonRecord;
  const url = getNonEmptyString(record.url);
  const sha256 = getNonEmptyString(record.sha256)?.toLowerCase() ?? null;
  const size = typeof record.size === 'number' && Number.isFinite(record.size) ? record.size : null;
  const type = getNonEmptyString(record.type);
  const uploaded = typeof record.uploaded === 'number' && Number.isFinite(record.uploaded) ? record.uploaded : null;

  if (!url || !sha256 || !/^[0-9a-f]{64}$/.test(sha256) || size === null || !type || uploaded === null) {
    return null;
  }

  return {
    url,
    sha256,
    size,
    type,
    uploaded,
    nip94: record.nip94,
  };
}

function serverRejectedError(response: BlossomUploadTransportResponse): BlossomUploadServerRejectedError {
  const reason = getHeader(response.headers, 'x-reason') ?? extractResponseMessage(response.body);
  const body = stringifyResponseBody(response.body);
  return {
    type: 'server-rejected',
    status: response.status,
    message: reason || `Blossom upload failed (${response.status})`,
    reason,
    body,
    retryable: isTransientStatus(response.status),
  };
}

function retryExhaustedError(
  attempts: number,
  lastError: BlossomUploadNetworkError | BlossomUploadTimeoutError | BlossomUploadServerRejectedError
): BlossomUploadRetryExhaustedError {
  return {
    type: 'retry-exhausted',
    attempts,
    lastError,
    message: `Blossom upload failed after ${attempts} attempts: ${lastError.message}`,
    retryable: false,
  };
}

function isRetryableUploadError(
  error: BlossomUploadError
): error is BlossomUploadNetworkError | BlossomUploadTimeoutError | BlossomUploadServerRejectedError {
  return error.retryable === true;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function transportErrorFromUnknown(error: unknown, signal?: AbortSignal): BlossomUploadError {
  if (signal?.aborted) return cancelledError();
  if (error instanceof BlossomTransportFailure) {
    if (error.failureType === 'cancelled') return cancelledError();
    if (error.failureType === 'timeout') {
      return {
        type: 'timeout',
        message: error.message || 'Blossom upload timed out.',
        retryable: true,
      };
    }
    return networkError(error.message || 'Blossom upload failed due to a network error.');
  }

  return networkError(messageFromUnknown(error, 'Blossom upload failed due to a network error.'));
}

function networkError(message: string): BlossomUploadNetworkError {
  return {
    type: 'network',
    message,
    retryable: true,
  };
}

function cancelledError(): BlossomUploadCancelledError {
  return {
    type: 'cancelled',
    message: 'Blossom upload was cancelled.',
    retryable: false,
  };
}

function buildProgressReporter(params: {
  attempt: number;
  totalBytes: number;
  onProgress?: (progress: BlossomUploadProgress) => void;
}): ((progress: BlossomUploadTransportProgress) => void) | undefined {
  if (!params.onProgress) return undefined;

  return (progress) => {
    const totalBytes =
      typeof progress.totalBytes === 'number' && Number.isFinite(progress.totalBytes) && progress.totalBytes > 0
        ? progress.totalBytes
        : params.totalBytes > 0
          ? params.totalBytes
          : null;
    const upperBound = totalBytes ?? Number.MAX_SAFE_INTEGER;
    const loadedBytes = clampNumber(progress.loadedBytes, 0, upperBound);

    params.onProgress?.({
      stage: 'uploading',
      attempt: params.attempt,
      loadedBytes,
      totalBytes,
      fraction: totalBytes && totalBytes > 0 ? loadedBytes / totalBytes : null,
    });
  };
}

function clampNumber(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

async function uploadWithXmlHttpRequest(
  request: BlossomUploadTransportRequest
): Promise<BlossomUploadTransportResponse> {
  if (typeof XMLHttpRequest === 'undefined') {
    throw new BlossomTransportFailure('network', 'XMLHttpRequest is not available in this runtime.');
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const rejectOnce = (error: BlossomTransportFailure) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        status: xhr.status,
        headers: parseRawHeaders(xhr.getAllResponseHeaders?.() ?? ''),
        body: xhr.responseText,
      });
    };

    const abort = () => {
      xhr.abort();
      rejectOnce(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));
    };

    const cleanup = () => {
      request.signal?.removeEventListener('abort', abort);
    };

    if (request.signal?.aborted) {
      rejectOnce(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));
      return;
    }

    request.signal?.addEventListener('abort', abort, { once: true });
    xhr.open(request.method, request.url);
    xhr.timeout = request.timeoutMs;

    for (const [name, value] of Object.entries(request.headers)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      request.onProgress?.({
        loadedBytes: event.loaded,
        totalBytes: event.lengthComputable ? event.total : null,
      });
    };
    xhr.onload = resolveOnce;
    xhr.onerror = () => rejectOnce(new BlossomTransportFailure('network', 'Blossom upload failed due to a network error.'));
    xhr.ontimeout = () => rejectOnce(new BlossomTransportFailure('timeout', 'Blossom upload timed out.'));
    xhr.onabort = () => rejectOnce(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));
    xhr.send(typedArrayToArrayBuffer(request.body));
  });
}

function typedArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer as ArrayBuffer;
  }
  return bytes.slice().buffer as ArrayBuffer;
}

function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (delayMs <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new BlossomTransportFailure('cancelled', 'Upload cancelled.'));
    };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function parseRawHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of rawHeaders.trim().split(/[\r\n]+/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers[name] = value;
  }
  return headers;
}

function getHeader(headers: BlossomUploadTransportResponse['headers'], name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name);

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    if (key.toLowerCase() === lowerName) return value;
  }
  return null;
}

function parseResponseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function stringifyResponseBody(body: unknown): string | null {
  if (typeof body === 'string') return body.length > 0 ? body : null;
  if (body === null || body === undefined) return null;
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

function extractResponseMessage(body: unknown): string | null {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const record = body as JsonRecord;
    return getNonEmptyString(record.message) ?? getNonEmptyString(record.error) ?? null;
  }
  return null;
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('SHA-256 digest must be a 64-character lowercase hex string.');
  }
  return normalized;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function messageFromUnknown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isSignedAuthEvent(value: unknown): value is BlossomSignedAuthEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as BlossomSignedAuthEvent).kind === BLOSSOM_UPLOAD_AUTH_KIND &&
    Array.isArray((value as BlossomSignedAuthEvent).tags)
  );
}
