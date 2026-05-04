import {
  buildBlossomMediaMetadataTags,
  normalizeBlossomMediaMetadata,
  type BlossomMediaMetadataDescriptor,
} from '@lib/media/blossomMetadata';
import { parseBlossomMediaFromEvent } from '@lib/media/blossomRender';
import type { BlossomUploadedMedia } from '@lib/media/blossomUpload';

const HASH = 'a'.repeat(64);
const UPPER_HASH = 'B'.repeat(64);

function uploadedMedia(overrides: Partial<BlossomUploadedMedia> = {}): BlossomUploadedMedia {
  return {
    url: `https://cdn.example.com/${UPPER_HASH}.JPG#ignored`,
    sha256: UPPER_HASH,
    size: 1234.9,
    type: 'Image/JPEG',
    uploaded: 1_714_000_000,
    server: {
      url: 'https://cdn.example.com',
      source: 'app-default',
    },
    sourceServerUrl: 'https://cdn.example.com',
    endpoint: '/upload',
    mediaKind: 'image',
    source: {
      uri: 'file:///picked/image.jpg',
      fileName: 'image.jpg',
      width: 640.9,
      height: 480.2,
    },
    descriptor: {
      url: `https://cdn.example.com/${UPPER_HASH}.JPG#ignored`,
      sha256: UPPER_HASH,
      size: 1234.9,
      type: 'Image/JPEG',
      uploaded: 1_714_000_000,
    },
    ...overrides,
  };
}

describe('blossomMetadata', () => {
  it('builds deterministic imeta and top-level tags from uploaded Blossom media', () => {
    const tags = buildBlossomMediaMetadataTags({
      media: [uploadedMedia()],
    });

    const normalizedHash = UPPER_HASH.toLowerCase();

    expect(tags).toEqual([
      [
        'imeta',
        `url https://cdn.example.com/${UPPER_HASH}.JPG`,
        `x ${normalizedHash}`,
        'm image/jpeg',
        'size 1234',
        'dim 640x480',
      ],
      ['r', `https://cdn.example.com/${UPPER_HASH}.JPG`],
      ['x', normalizedHash],
      ['m', 'image/jpeg'],
      ['size', '1234'],
      ['dim', '640x480'],
    ]);
  });

  it('round-trips generated tags through the reusable Blossom render parser', () => {
    const tags = buildBlossomMediaMetadataTags({
      media: [uploadedMedia()],
    });

    const [descriptor] = parseBlossomMediaFromEvent({
      tags,
      authorBlossomServerUrls: ['https://fallback.example.com/path'],
    });

    expect(descriptor).toMatchObject({
      url: `https://cdn.example.com/${UPPER_HASH}.JPG`,
      sha256: UPPER_HASH.toLowerCase(),
      mimeType: 'image/jpeg',
      size: 1234,
      width: 640,
      height: 480,
      source: 'imeta',
      renderKind: 'image',
      status: 'renderable',
      fallbackUrls: [`https://fallback.example.com/${UPPER_HASH.toLowerCase()}.jpg`],
    });
  });

  it('accepts neutral descriptor inputs without requiring uploaded-media state', () => {
    const descriptor: BlossomMediaMetadataDescriptor = {
      url: `https://cdn.example.com/${HASH}.png`,
      sha256: HASH,
      type: 'image/png',
      size: '987',
      width: '320',
      height: '240',
    };

    expect(buildBlossomMediaMetadataTags({ media: [descriptor] })).toEqual([
      [
        'imeta',
        `url https://cdn.example.com/${HASH}.png`,
        `x ${HASH}`,
        'm image/png',
        'size 987',
        'dim 320x240',
      ],
      ['r', `https://cdn.example.com/${HASH}.png`],
      ['x', HASH],
      ['m', 'image/png'],
      ['size', '987'],
      ['dim', '320x240'],
    ]);
  });

  it('dedupes duplicate URLs while preserving first-media ordering', () => {
    const first: BlossomMediaMetadataDescriptor = {
      url: `https://cdn.example.com/${HASH}.png#one`,
      sha256: HASH,
      type: 'image/png',
    };
    const duplicate: BlossomMediaMetadataDescriptor = {
      url: `https://CDN.example.com/${HASH}.png#two`,
      sha256: UPPER_HASH,
      type: 'image/jpeg',
    };
    const second: BlossomMediaMetadataDescriptor = {
      url: `https://cdn.example.com/${UPPER_HASH.toLowerCase()}.webp`,
      sha256: UPPER_HASH,
      type: 'image/webp',
    };

    const tags = buildBlossomMediaMetadataTags({
      media: [first, duplicate, second],
    });

    expect(tags).toEqual([
      ['imeta', `url https://cdn.example.com/${HASH}.png`, `x ${HASH}`, 'm image/png'],
      ['r', `https://cdn.example.com/${HASH}.png`],
      ['x', HASH],
      ['m', 'image/png'],
      [
        'imeta',
        `url https://cdn.example.com/${UPPER_HASH.toLowerCase()}.webp`,
        `x ${UPPER_HASH.toLowerCase()}`,
        'm image/webp',
      ],
      ['r', `https://cdn.example.com/${UPPER_HASH.toLowerCase()}.webp`],
      ['x', UPPER_HASH.toLowerCase()],
      ['m', 'image/webp'],
    ]);
  });

  it('omits invalid optional metadata but rejects invalid URLs', () => {
    expect(
      normalizeBlossomMediaMetadata({
        url: `https://cdn.example.com/${HASH}.png`,
        sha256: 'not-a-hash',
        type: 'not a mime',
        size: 0,
        width: 640,
      })
    ).toEqual({
      url: `https://cdn.example.com/${HASH}.png`,
      width: 640,
    });

    expect(
      buildBlossomMediaMetadataTags({
        media: [
          {
            url: 'ftp://cdn.example.com/not-allowed.png',
            sha256: HASH,
            type: 'image/png',
          },
        ],
      })
    ).toEqual([]);
  });
});
