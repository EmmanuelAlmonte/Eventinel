import {
  BlossomTransportFailure,
  type BlossomRetryPolicy,
  type BlossomUploadError,
  type BlossomUploadOutcome,
  type BlossomUploadProgress,
  type BlossomUploadTransport,
  type BlossomUploadTransportProgress,
  type BlossomUploadTransportRequest,
  type BlossomUploadTransportResponse,
} from './blossomUploadTypes';
import { cancelledError, messageFromUnknown, networkError, transportErrorFromUnknown } from './blossomUploadErrors';

const DEFAULT_RETRY_POLICY = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5_000,
  multiplier: 2,
};

export function normalizeRetryPolicy(policy: BlossomRetryPolicy | undefined): Required<BlossomRetryPolicy> {
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

export function computeRetryDelayMs(policy: Required<BlossomRetryPolicy>, attempt: number): number {
  const nextDelay = policy.initialDelayMs * policy.multiplier ** Math.max(0, attempt - 1);
  return Math.min(policy.maxDelayMs, Math.floor(nextDelay));
}

export async function waitBeforeRetry(
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

export async function runTransportAttempt(
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

export function buildProgressReporter(params: {
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

export async function uploadWithXmlHttpRequest(
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

export function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
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
