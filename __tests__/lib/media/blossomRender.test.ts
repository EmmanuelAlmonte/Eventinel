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
      fallbackUrls: [`https://fallback.example.com/${HASH}.png`],
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
});
