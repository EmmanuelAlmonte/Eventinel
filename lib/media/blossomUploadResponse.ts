import type { BlossomServer } from './blossomConfig';
import {
  type BlossomBlobDescriptor,
  type BlossomUploadMedia,
  type BlossomUploadOutcome,
  type BlossomUploadServerRejectedError,
  type BlossomUploadTransportResponse,
  type JsonRecord,
} from './blossomUploadTypes';
import { isTransientStatus } from './blossomUploadErrors';

export function normalizeTransportResponse(
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
