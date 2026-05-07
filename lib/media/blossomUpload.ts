import { classifyBlossomMediaAllowance } from './blossomConfig';
import {
  buildBlossomAuthEventTemplate,
  buildBlossomUploadUrl,
  encodeBlossomAuthHeader,
  normalizeSha256,
  readFileBytesWithExpoFileSystem,
  resolveBlossomAuthVerb,
  resolveBlossomUploadEndpoint,
  sha256HexWithExpoCrypto,
  signWithDefaultNdkSigner,
} from './blossomUploadAuth';
import { cancelledError, isRetryableUploadError, networkError, retryExhaustedError, messageFromUnknown } from './blossomUploadErrors';
import { normalizeTransportResponse } from './blossomUploadResponse';
import {
  buildProgressReporter,
  computeRetryDelayMs,
  normalizeRetryPolicy,
  runTransportAttempt,
  sleepWithAbort,
  uploadWithXmlHttpRequest,
  waitBeforeRetry,
} from './blossomUploadTransport';
import type {
  BlossomUploadNetworkError,
  BlossomUploadOutcome,
  BlossomUploadInvalidResponseError,
  BlossomUploadParams,
  BlossomUploadServerRejectedError,
  BlossomUploadTimeoutError,
  BlossomUploadTransportRequest,
  BlossomUploadTransportResponse,
  BlossomUploadedMedia,
} from './blossomUploadTypes';
import { BlossomDefaultAuthMissing } from './blossomUploadTypes';

const DEFAULT_TIMEOUT_MS = 30_000;

export {
  BLOSSOM_UPLOAD_AUTH_KIND,
  type BlossomAuthSigner,
  type BlossomBlobDescriptor,
  type BlossomReadFileBytes,
  type BlossomRetryPolicy,
  type BlossomSha256Digest,
  type BlossomSignedAuthEvent,
  type BlossomUnsignedAuthEvent,
  type BlossomUploadedMedia,
  type BlossomUploadAuthVerb,
  type BlossomUploadCancelledError,
  type BlossomUploadError,
  type BlossomUploadHashFailedError,
  type BlossomUploadInvalidResponseError,
  type BlossomUploadMedia,
  type BlossomUploadNetworkError,
  type BlossomUploadOutcome,
  type BlossomUploadParams,
  type BlossomUploadProgress,
  type BlossomUploadReadFailedError,
  type BlossomUploadRetryExhaustedError,
  type BlossomUploadServerRejectedError,
  type BlossomUploadTimeoutError,
  type BlossomUploadTransport,
  type BlossomUploadTransportProgress,
  type BlossomUploadTransportRequest,
  type BlossomUploadTransportResponse,
  type BlossomUploadValidationError,
  type BlossomUploadAuthFailedError,
  type BlossomUploadAuthMissingError,
} from './blossomUploadTypes';
export {
  buildBlossomAuthEventTemplate,
  buildBlossomUploadUrl,
  encodeBlossomAuthHeader,
  resolveBlossomAuthVerb,
  resolveBlossomServerAuthTag,
  resolveBlossomUploadEndpoint,
} from './blossomUploadAuth';

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

    if (normalized.ok) {
      const verificationError = verifyNormalizedUploadResult(
        normalized.result,
        sha256,
        bytes.byteLength,
        responseOutcome.response
      );
      if (verificationError) return { ok: false, error: verificationError };
      return normalized;
    }

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

function verifyNormalizedUploadResult(
  result: BlossomUploadedMedia,
  expectedSha256: string,
  expectedSize: number,
  response: BlossomUploadTransportResponse
): BlossomUploadInvalidResponseError | null {
  if (
    result.sha256.toLowerCase() !== expectedSha256 ||
    result.descriptor.sha256.toLowerCase() !== expectedSha256
  ) {
    return invalidUploadResponseError(
      response,
      'Blossom server response SHA-256 did not match the uploaded media hash.'
    );
  }

  if (hasUploadSizeMismatch(result.size, expectedSize) || hasUploadSizeMismatch(result.descriptor.size, expectedSize)) {
    return invalidUploadResponseError(
      response,
      'Blossom server response size did not match the uploaded media byte length.'
    );
  }

  return null;
}

function hasUploadSizeMismatch(size: unknown, expectedSize: number): boolean {
  return typeof size === 'number' && Number.isFinite(size) && size !== expectedSize;
}

function invalidUploadResponseError(
  response: BlossomUploadTransportResponse,
  message: string
): BlossomUploadInvalidResponseError {
  return {
    type: 'invalid-response',
    status: response.status,
    message,
    body: stringifyInvalidResponseBody(response.body),
    retryable: false,
  };
}

function stringifyInvalidResponseBody(body: unknown): string | null {
  if (typeof body === 'string') return body.length > 0 ? body : null;
  if (body === null || body === undefined) return null;

  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}
