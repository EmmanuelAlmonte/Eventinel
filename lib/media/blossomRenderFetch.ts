import { Buffer } from 'buffer';

import type {
  BlossomFetchBytes,
  BlossomSha256Digest,
  BlossomSha256VerificationResult,
  FetchAndVerifyBlossomMediaParams,
  FetchAndVerifyBlossomMediaResult,
  FetchBlossomMediaAttempt,
} from './blossomRenderTypes';
import { isSha256Hex, normalizeCandidateUrls, normalizeMimeType, normalizeSha256 } from './blossomRenderUrls';

const DEFAULT_BLOSSOM_RENDER_MAX_BYTES = 10 * 1024 * 1024;

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
  const maxBytes = normalizeMaxBytes(params.maxBytes);
  const mimeType = normalizeMimeType(params.mimeType) ?? 'application/octet-stream';
  const attempts: FetchBlossomMediaAttempt[] = [];

  for (const url of candidateUrls) {
    let bytes: Uint8Array;
    try {
      bytes = await fetchBytes(url, { signal: params.signal, maxBytes });
    } catch (error) {
      attempts.push({
        url,
        reason: 'fetch-failed',
        message: messageFromUnknown(error, 'Failed to fetch Blossom media bytes.'),
      });
      continue;
    }

    if (bytes.byteLength > maxBytes) {
      attempts.push({
        url,
        reason: 'fetch-failed',
        message: formatMediaTooLargeMessage(bytes.byteLength, maxBytes),
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

async function sha256HexWithExpoCrypto(bytes: Uint8Array): Promise<string> {
  const Crypto = await import('expo-crypto');
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return arrayBufferToHex(digest);
}

async function fetchBytesWithGlobalFetch(
  url: string,
  options: { signal?: AbortSignal; maxBytes?: number } = {}
): Promise<Uint8Array> {
  if (typeof fetch !== 'function') {
    throw new Error('No fetch implementation is available for Blossom media retrieval.');
  }

  const maxBytes = normalizeMaxBytes(options.maxBytes);
  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Blossom media fetch failed with HTTP ${response.status}.`);
  }

  const contentLength = getResponseContentLength(response);
  if (contentLength !== null && contentLength > maxBytes) {
    throw new Error(formatMediaTooLargeMessage(contentLength, maxBytes));
  }

  const streamedBytes = await readResponseBodyBytes(response, maxBytes);
  if (streamedBytes) {
    return streamedBytes;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new Error(formatMediaTooLargeMessage(bytes.byteLength, maxBytes));
  }

  return bytes;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function messageFromUnknown(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeMaxBytes(maxBytes: number | undefined): number {
  return typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0
    ? Math.floor(maxBytes)
    : DEFAULT_BLOSSOM_RENDER_MAX_BYTES;
}

function getResponseContentLength(response: Response): number | null {
  const rawContentLength = response.headers?.get?.('content-length');
  if (!rawContentLength) return null;

  const contentLength = Number(rawContentLength);
  return Number.isSafeInteger(contentLength) && contentLength >= 0 ? contentLength : null;
}

type ReadableResponseBody = {
  getReader: () => {
    read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    cancel?: () => Promise<void>;
    releaseLock?: () => void;
  };
};

function isReadableResponseBody(body: unknown): body is ReadableResponseBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'getReader' in body &&
    typeof (body as { getReader?: unknown }).getReader === 'function'
  );
}

async function readResponseBodyBytes(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const body = response.body;
  if (!isReadableResponseBody(body)) return null;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel?.();
        throw new Error(formatMediaTooLargeMessage(totalBytes, maxBytes));
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function formatMediaTooLargeMessage(actualBytes: number, maxBytes: number): string {
  return `Blossom media response is ${actualBytes} bytes, which exceeds the Blossom render download limit of ${maxBytes} bytes.`;
}
