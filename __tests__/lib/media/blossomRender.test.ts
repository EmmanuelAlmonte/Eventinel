import {
  buildBlossomFallbackUrls,
  extractBlossomHashFromUrl,
  fetchAndVerifyBlossomMedia,
  isSha256Hex,
  parseBlossomMediaFromEvent,
  resolveBlossomDisplayUrl,
  verifyBlossomBytesSha256,
  type BlossomFetchBytes,
} from '@lib/media/blossomRender';

const HASH = 'a'.repeat(64);
const SECOND_HASH = 'b'.repeat(64);
const UPPER_HASH = 'C'.repeat(64);
const originalFetch = global.fetch;

afterEach(() => {
  Object.defineProperty(global, 'fetch', {
    value: originalFetch,
    configurable: true,
    writable: true,
  });
});

describe('blossomRender', () => {
  it('validates 64-character SHA-256 hex values', () => {
    expect(isSha256Hex(HASH)).toBe(true);
    expect(isSha256Hex(UPPER_HASH)).toBe(true);
    expect(isSha256Hex('a'.repeat(63))).toBe(false);
    expect(isSha256Hex('g'.repeat(64))).toBe(false);
    expect(isSha256Hex(` ${HASH}`)).toBe(false);
  });

  it('extracts hash-addressed Blossom URLs with optional extensions', () => {
    expect(extractBlossomHashFromUrl(`https://cdn.example.com/${HASH}`)).toEqual({
      sha256: HASH,
      extension: null,
    });
    expect(extractBlossomHashFromUrl(`https://cdn.example.com/media/${UPPER_HASH}.PNG?download=1`)).toEqual({
      sha256: UPPER_HASH.toLowerCase(),
      extension: 'png',
    });
    expect(extractBlossomHashFromUrl('https://cdn.example.com/media/not-a-hash.png')).toBeNull();
    expect(extractBlossomHashFromUrl(`ftp://cdn.example.com/${HASH}.png`)).toBeNull();
  });

  it('builds normalized, deduped fallback URLs while excluding the original URL', () => {
    const fallbackUrls = buildBlossomFallbackUrls({
      serverUrls: [
        'https://cdn.example.com/path',
        'https://cdn.example.com',
        'ftp://invalid.example.com',
        'https://fallback.example.com/upload',
      ],
      sha256: HASH.toUpperCase(),
      extension: '.PNG',
      originalUrl: `https://cdn.example.com/${HASH}.png?download=1`,
    });

    expect(fallbackUrls).toEqual([
      `https://cdn.example.com/path/${HASH}.png`,
      `https://cdn.example.com/${HASH}.png`,
      `https://fallback.example.com/${HASH}.png`,
    ]);
  });

  it('does not duplicate the original Blossom URL when there is no query-token difference', () => {
    const fallbackUrls = buildBlossomFallbackUrls({
      serverUrls: [
        'https://cdn.example.com',
        'https://cdn.example.com/upload',
        'https://fallback.example.com',
        'https://fallback.example.com/media',
      ],
      sha256: HASH,
      extension: 'png',
      originalUrl: `https://cdn.example.com/${HASH}.png`,
    });

    expect(fallbackUrls).toEqual([`https://fallback.example.com/${HASH}.png`]);
  });

  it('maps local Blossom URLs to the Android emulator host loopback address for display', () => {
    expect(resolveBlossomDisplayUrl(`http://localhost:3000/${HASH}.png`, { platform: 'android' })).toBe(
      `http://10.0.2.2:3000/${HASH}.png`
    );
    expect(resolveBlossomDisplayUrl(`http://127.0.0.1:3000/${HASH}.png`, { platform: 'android' })).toBe(
      `http://10.0.2.2:3000/${HASH}.png`
    );
    expect(resolveBlossomDisplayUrl(`http://0.0.0.0:3000/${HASH}.png`, { platform: 'android' })).toBe(
      `http://10.0.2.2:3000/${HASH}.png`
    );
    expect(resolveBlossomDisplayUrl(`http://localhost:3000/${HASH}.png`, { platform: 'ios' })).toBe(
      `http://localhost:3000/${HASH}.png`
    );
  });

  it('parses imeta URL, hash, MIME, size, and dimensions into one image descriptor', () => {
    const [media] = parseBlossomMediaFromEvent({
      content: 'incident image attached',
      tags: [
        [
          'imeta',
          `url https://cdn.example.com/${HASH}.png`,
          `x ${HASH}`,
          'm image/png',
          'size 1234',
          'dim 640x480',
        ],
      ],
      authorBlossomServerUrls: ['https://fallback.example.com/path'],
    });

    expect(media).toMatchObject({
      url: `https://cdn.example.com/${HASH}.png`,
      sha256: HASH,
      mimeType: 'image/png',
      size: 1234,
      width: 640,
      height: 480,
      source: 'imeta',
      renderKind: 'image',
      status: 'renderable',
      fallbackUrls: [`https://fallback.example.com/path/${HASH}.png`],
    });
  });

  it('ignores or downgrades malformed URL, SHA, size, and dimension metadata safely', () => {
    const media = parseBlossomMediaFromEvent({
      content: '',
      tags: [
        ['imeta', 'url ftp://cdn.example.com/not-allowed.png', `x ${HASH}`, 'm image/png'],
        [
          'imeta',
          'url https://cdn.example.com/not-hash.png',
          'x not-a-sha',
          'm image/png',
          'size nope',
          'dim widextall',
        ],
      ],
      authorBlossomServerUrls: ['https://fallback.example.com'],
    });

    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({
      url: 'https://cdn.example.com/not-hash.png',
      mimeType: 'image/png',
      renderKind: 'image',
      status: 'renderable',
      fallbackUrls: [],
    });
    expect(media[0].sha256).toBeUndefined();
    expect(media[0].size).toBeUndefined();
    expect(media[0].width).toBeUndefined();
    expect(media[0].height).toBeUndefined();
  });

  it('dedupes imeta and top-level tag data for the same URL', () => {
    const media = parseBlossomMediaFromEvent({
      content: `duplicate ${`https://cdn.example.com/${HASH}.png`}`,
      tags: [
        ['imeta', `url https://cdn.example.com/${HASH}.png`, `x ${HASH}`, 'm image/png', 'size 10'],
        ['r', `https://cdn.example.com/${HASH}.png`],
        ['x', HASH],
        ['m', 'image/png'],
        ['size', '10'],
      ],
      authorBlossomServerUrls: ['https://fallback.example.com'],
    });

    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({
      source: 'imeta',
      sha256: HASH,
      mimeType: 'image/png',
      fallbackUrls: [`https://fallback.example.com/${HASH}.png`],
    });
  });

  it('ignores generic r tags that are not paired with media metadata', () => {
    const media = parseBlossomMediaFromEvent({
      content: '',
      tags: [
        ['r', 'https://example.com/reference-page'],
        ['p', 'not-media-metadata'],
      ],
    });

    expect(media).toEqual([]);
  });

  it('infers image MIME and hash metadata from plain content URLs', () => {
    const [media] = parseBlossomMediaFromEvent({
      content: `See https://cdn.example.com/files/${UPPER_HASH}.JPG.`,
      tags: [],
      authorBlossomServerUrls: ['https://fallback.example.com'],
    });

    expect(media).toMatchObject({
      url: `https://cdn.example.com/files/${UPPER_HASH}.JPG`,
      sha256: UPPER_HASH.toLowerCase(),
      mimeType: 'image/jpeg',
      source: 'content-url',
      renderKind: 'image',
      status: 'renderable',
      fallbackUrls: [`https://fallback.example.com/${UPPER_HASH.toLowerCase()}.jpg`],
    });
  });

  it('blocks video metadata by default', () => {
    const [media] = parseBlossomMediaFromEvent({
      content: '',
      tags: [['imeta', `url https://cdn.example.com/${HASH}.mp4`, `x ${HASH}`, 'm video/mp4', 'size 10']],
    });

    expect(media).toMatchObject({
      renderKind: 'video',
      status: 'blocked',
      reason: 'video-unsupported',
    });
  });

  it('passes and fails byte verification with an injected digest', async () => {
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(verifyBlossomBytesSha256(bytes, HASH, async () => HASH.toUpperCase())).resolves.toEqual({
      ok: true,
      sha256: HASH,
    });

    await expect(verifyBlossomBytesSha256(bytes, HASH, async () => SECOND_HASH)).resolves.toMatchObject({
      ok: false,
      reason: 'sha256-mismatch',
      expectedSha256: HASH,
      actualSha256: SECOND_HASH,
    });
  });

  it('tries candidates sequentially and returns a data URI only after SHA match', async () => {
    const firstBytes = new Uint8Array([1]);
    const secondBytes = new Uint8Array([2]);
    const fetchBytes: jest.MockedFunction<BlossomFetchBytes> = jest.fn(async (url) => {
      return url.includes('fallback') ? secondBytes : firstBytes;
    });

    const outcome = await fetchAndVerifyBlossomMedia({
      url: `https://cdn.example.com/${HASH}.png`,
      fallbackUrls: [`https://fallback.example.com/${HASH}.png`],
      expectedSha256: HASH,
      mimeType: 'image/png',
      maxBytes: 1,
      fetchBytes,
      digest: async (bytes) => (bytes[0] === 2 ? HASH : SECOND_HASH),
    });

    expect(outcome).toMatchObject({
      ok: true,
      url: `https://fallback.example.com/${HASH}.png`,
      sha256: HASH,
      mimeType: 'image/png',
      dataUri: 'data:image/png;base64,Ag==',
      attemptedUrls: [`https://cdn.example.com/${HASH}.png`, `https://fallback.example.com/${HASH}.png`],
    });
    expect(fetchBytes.mock.calls.map(([url]) => url)).toEqual([
      `https://cdn.example.com/${HASH}.png`,
      `https://fallback.example.com/${HASH}.png`,
    ]);
    expect(fetchBytes.mock.calls.every(([, options]) => options?.maxBytes === 1)).toBe(true);
  });

  it('reports all candidate failures when every fetched URL mismatches the hash', async () => {
    const outcome = await fetchAndVerifyBlossomMedia({
      candidateUrls: [`https://cdn.example.com/${HASH}.png`, `https://fallback.example.com/${HASH}.png`],
      expectedSha256: HASH,
      fetchBytes: jest.fn(async () => new Uint8Array([9])),
      digest: async () => SECOND_HASH,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: 'all-candidates-failed',
      attemptedUrls: [`https://cdn.example.com/${HASH}.png`, `https://fallback.example.com/${HASH}.png`],
      attempts: [
        {
          url: `https://cdn.example.com/${HASH}.png`,
          reason: 'sha256-mismatch',
          actualSha256: SECOND_HASH,
        },
        {
          url: `https://fallback.example.com/${HASH}.png`,
          reason: 'sha256-mismatch',
          actualSha256: SECOND_HASH,
        },
      ],
    });
  });

  it('rejects oversized Content-Length before reading or digesting media bytes', async () => {
    const url = `https://cdn.example.com/${HASH}.png`;
    const arrayBuffer = jest.fn(async () => new Uint8Array([1, 2, 3, 4]).buffer);
    const digest = jest.fn(async () => HASH);
    setGlobalFetch(
      jest.fn(async (_input: RequestInfo | URL) =>
        mockFetchResponse({
          contentLength: '4',
          arrayBuffer,
        })
      )
    );

    const outcome = await fetchAndVerifyBlossomMedia({
      candidateUrls: [url],
      expectedSha256: HASH,
      maxBytes: 3,
      digest,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: 'all-candidates-failed',
      attemptedUrls: [url],
      attempts: [
        {
          url,
          reason: 'fetch-failed',
        },
      ],
    });
    if (!outcome.ok) {
      expect(outcome.attempts[0].message).toContain('exceeds the Blossom render download limit of 3 bytes');
    }
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
  });

  it('stops streamed downloads when the byte count exceeds the render limit', async () => {
    const url = `https://cdn.example.com/${HASH}.png`;
    const arrayBuffer = jest.fn(async () => new Uint8Array([1, 2, 3, 4]).buffer);
    const read = jest
      .fn()
      .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2]) })
      .mockResolvedValueOnce({ done: false, value: new Uint8Array([3, 4]) });
    const cancel = jest.fn(async () => undefined);
    const releaseLock = jest.fn();
    const digest = jest.fn(async () => HASH);

    setGlobalFetch(
      jest.fn(async (_input: RequestInfo | URL) =>
        mockFetchResponse({
          body: {
            getReader: () => ({
              read,
              cancel,
              releaseLock,
            }),
          },
          arrayBuffer,
        })
      )
    );

    const outcome = await fetchAndVerifyBlossomMedia({
      candidateUrls: [url],
      expectedSha256: HASH,
      maxBytes: 3,
      digest,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: 'all-candidates-failed',
      attempts: [
        {
          url,
          reason: 'fetch-failed',
        },
      ],
    });
    if (!outcome.ok) {
      expect(outcome.attempts[0].message).toContain('exceeds the Blossom render download limit of 3 bytes');
    }
    expect(read).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
  });
});

function setGlobalFetch(fetchImpl: jest.MockedFunction<typeof fetch>): void {
  Object.defineProperty(global, 'fetch', {
    value: fetchImpl,
    configurable: true,
    writable: true,
  });
}

function mockFetchResponse(params: {
  contentLength?: string;
  body?: unknown;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-length' ? (params.contentLength ?? null) : null),
    },
    body: params.body,
    arrayBuffer: params.arrayBuffer,
  } as unknown as Response;
}
