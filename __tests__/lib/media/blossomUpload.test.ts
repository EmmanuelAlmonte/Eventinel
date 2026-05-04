import { Buffer } from 'buffer';

import {
  buildBlossomCapabilityState,
  buildBlossomConfig,
  type BlossomCapabilityState,
} from '@lib/media/blossomConfig';
import {
  encodeBlossomAuthHeader,
  uploadToBlossom,
  type BlossomAuthSigner,
  type BlossomSignedAuthEvent,
  type BlossomUploadParams,
  type BlossomUploadTransport,
  type BlossomUploadTransportRequest,
  type BlossomUploadTransportResponse,
} from '@lib/media/blossomUpload';

const HASH = 'a'.repeat(64);
const SECOND_HASH = 'b'.repeat(64);
const BYTES = new Uint8Array([1, 2, 3, 4]);

const blobDescriptor = (overrides: Partial<Record<string, unknown>> = {}) => ({
  url: `https://cdn.example.com/${HASH}.jpg`,
  sha256: HASH,
  size: BYTES.byteLength,
  type: 'image/jpeg',
  uploaded: 1_714_000_000,
  ...overrides,
});

function readyCapability(input: Record<string, unknown> = {}): BlossomCapabilityState {
  return buildBlossomCapabilityState(
    buildBlossomConfig({
      EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
      ...input,
    })
  );
}

function signAuth(event: Parameters<BlossomAuthSigner>[0]): Promise<BlossomSignedAuthEvent> {
  return Promise.resolve({
    ...event,
    id: 'signed-auth-id',
    pubkey: 'f'.repeat(64),
    sig: 'signed-auth-sig',
  });
}

function decodeAuthHeader(header: string): BlossomSignedAuthEvent {
  const payload = header.replace(/^Nostr\s+/, '');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

function successTransport(
  onRequest?: (request: BlossomUploadTransportRequest) => void,
  response: BlossomUploadTransportResponse = {
    status: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(blobDescriptor()),
  }
): jest.MockedFunction<BlossomUploadTransport> {
  return jest.fn(async (request) => {
    onRequest?.(request);
    return response;
  });
}

function baseParams(overrides: Partial<BlossomUploadParams> = {}): BlossomUploadParams {
  return {
    media: {
      uri: 'file:///picked/image.jpg',
      fileName: 'image.jpg',
      mimeType: 'image/jpeg',
      fileSize: BYTES.byteLength,
      width: 640,
      height: 480,
      type: 'image',
    },
    capability: readyCapability(),
    signer: signAuth,
    readFileBytes: jest.fn(async () => BYTES),
    sha256Digest: jest.fn(async () => HASH),
    transport: successTransport(),
    sleep: jest.fn(async () => undefined),
    now: () => 1_714_000_000_000,
    retry: { maxRetries: 0 },
    ...overrides,
  };
}

describe('blossomUpload', () => {
  it('constructs PUT /upload with content headers, SHA-256, and BUD-11 auth tags', async () => {
    const captured: { request?: BlossomUploadTransportRequest } = {};
    const transport = successTransport((request) => {
      captured.request = request;
    });

    const outcome = await uploadToBlossom(baseParams({ transport }));

    expect(outcome.ok).toBe(true);
    expect(captured.request).toBeDefined();
    expect(captured.request?.method).toBe('PUT');
    expect(captured.request?.url).toBe('https://cdn.example.com/upload');
    expect(captured.request?.headers['Content-Type']).toBe('image/jpeg');
    expect(captured.request?.headers['Content-Length']).toBe(String(BYTES.byteLength));
    expect(captured.request?.headers['X-SHA-256']).toBe(HASH);

    const authorization = captured.request?.headers.Authorization ?? '';
    expect(authorization).toMatch(/^Nostr [A-Za-z0-9_-]+$/);
    const event = decodeAuthHeader(authorization);
    expect(event.kind).toBe(24242);
    expect(event.tags).toEqual(
      expect.arrayContaining([
        ['t', 'upload'],
        ['expiration', '1714000300'],
        ['x', HASH],
        ['server', 'cdn.example.com'],
      ])
    );
  });

  it('uses PUT /media and the media auth verb when the Blossom capability requests media optimization', async () => {
    const captured: { request?: BlossomUploadTransportRequest } = {};
    const transport = successTransport((request) => {
      captured.request = request;
    });
    const capability = readyCapability({
      EVENTINEL_BLOSSOM_USE_MEDIA_ENDPOINT: 'true',
    });

    await uploadToBlossom(baseParams({ capability, transport }));

    expect(captured.request?.url).toBe('https://cdn.example.com/media');
    expect(decodeAuthHeader(captured.request?.headers.Authorization ?? '').tags).toEqual(
      expect.arrayContaining([['t', 'media']])
    );
  });

  it('rejects media through classifyBlossomMediaAllowance before auth or transport, including video disabled', async () => {
    const signer = jest.fn(signAuth);
    const transport = successTransport();

    const outcome = await uploadToBlossom(
      baseParams({
        signer,
        transport,
        media: {
          uri: 'file:///picked/video.mp4',
          mimeType: 'video/mp4',
          fileSize: 100,
          type: 'video',
        },
      })
    );

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'validation',
        reason: 'video-disabled',
        retryable: false,
      },
    });
    expect(signer).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('retries transient network failures with bounded backoff and returns success', async () => {
    const transport = jest.fn(async () => {
      if (transport.mock.calls.length < 3) {
        throw new Error('offline');
      }
      return {
        status: 201,
        body: JSON.stringify(blobDescriptor({ sha256: SECOND_HASH, url: `https://cdn.example.com/${SECOND_HASH}.jpg` })),
      };
    });
    const sleep = jest.fn(async (_delayMs: number, _signal?: AbortSignal) => undefined);

    const outcome = await uploadToBlossom(
      baseParams({
        transport,
        sleep,
        sha256Digest: jest.fn(async () => SECOND_HASH),
        retry: { maxRetries: 2, initialDelayMs: 100, maxDelayMs: 150, multiplier: 2 },
      })
    );

    expect(outcome.ok).toBe(true);
    expect(transport).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([100, 150]);
  });

  it('does not retry non-transient server rejections', async () => {
    const transport = jest.fn(async () => ({
      status: 415,
      headers: { 'X-Reason': 'Server does not accept image/heic blobs' },
      body: 'unsupported media',
    }));
    const sleep = jest.fn(async () => undefined);

    const outcome = await uploadToBlossom(baseParams({ transport, sleep, retry: { maxRetries: 2 } }));

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'server-rejected',
        status: 415,
        reason: 'Server does not accept image/heic blobs',
        body: 'unsupported media',
        retryable: false,
      },
    });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('reports retry exhaustion after bounded transient attempts', async () => {
    const transport = jest.fn(async () => {
      throw new Error('socket closed');
    });

    const outcome = await uploadToBlossom(
      baseParams({
        transport,
        retry: { maxRetries: 1, initialDelayMs: 0 },
      })
    );

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'retry-exhausted',
        attempts: 2,
        lastError: {
          type: 'network',
          message: 'socket closed',
        },
      },
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('cancels before transport starts', async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = successTransport();

    const outcome = await uploadToBlossom(baseParams({ signal: controller.signal, transport }));

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'cancelled',
        retryable: false,
      },
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('cancels while the transport promise is pending', async () => {
    const controller = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    let markTransportStarted: () => void = () => undefined;
    const transportStarted = new Promise<void>((resolve) => {
      markTransportStarted = resolve;
    });
    const transport = jest.fn((request) => {
      capturedSignal = request.signal;
      markTransportStarted();
      return new Promise<BlossomUploadTransportResponse>(() => undefined);
    });

    const promise = uploadToBlossom(baseParams({ signal: controller.signal, transport }));
    await transportStarted;
    controller.abort();
    const outcome = await promise;

    expect(capturedSignal?.aborted).toBe(true);
    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'cancelled',
        retryable: false,
      },
    });
  });

  it('normalizes upload progress to byte bounds and fraction', async () => {
    const onProgress = jest.fn();
    const transport = successTransport((request) => {
      request.onProgress?.({ loadedBytes: 12, totalBytes: 10 });
    });

    await uploadToBlossom(baseParams({ onProgress, transport }));

    expect(onProgress).toHaveBeenCalledWith({
      stage: 'uploading',
      attempt: 1,
      loadedBytes: 10,
      totalBytes: 10,
      fraction: 1,
    });
  });

  it('normalizes BlobDescriptor responses with source server and input dimensions', async () => {
    const outcome = await uploadToBlossom(baseParams());

    expect(outcome).toMatchObject({
      ok: true,
      result: {
        url: `https://cdn.example.com/${HASH}.jpg`,
        sha256: HASH,
        size: BYTES.byteLength,
        type: 'image/jpeg',
        uploaded: 1_714_000_000,
        sourceServerUrl: 'https://cdn.example.com',
        endpoint: '/upload',
        source: {
          uri: 'file:///picked/image.jpg',
          fileName: 'image.jpg',
          width: 640,
          height: 480,
        },
      },
    });
  });

  it('normalizes server status, body, and X-Reason rejection details', async () => {
    const transport = successTransport(undefined, {
      status: 413,
      headers: { 'X-Reason': 'File too large. Maximum allowed size is 100 bytes' },
      body: 'body says too large',
    });

    const outcome = await uploadToBlossom(baseParams({ transport }));

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'server-rejected',
        status: 413,
        message: 'File too large. Maximum allowed size is 100 bytes',
        reason: 'File too large. Maximum allowed size is 100 bytes',
        body: 'body says too large',
        retryable: false,
      },
    });
  });

  it('normalizes auth signing failure without attempting upload', async () => {
    const transport = successTransport();

    const outcome = await uploadToBlossom(
      baseParams({
        signer: jest.fn(async () => {
          throw new Error('signer denied');
        }),
        transport,
      })
    );

    expect(outcome).toMatchObject({
      ok: false,
      error: {
        type: 'auth-failed',
        message: 'signer denied',
        retryable: false,
      },
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('encodes BUD-11 auth headers with base64url', () => {
    const header = encodeBlossomAuthHeader({
      kind: 24242,
      content: 'Authorize Blossom upload',
      created_at: 1,
      tags: [['t', 'upload']],
      sig: 'needs+/padding==',
    });

    expect(header).toMatch(/^Nostr [A-Za-z0-9_-]+$/);
    expect(decodeAuthHeader(header).sig).toBe('needs+/padding==');
  });
});
