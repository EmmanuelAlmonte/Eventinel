import {
  BLOSSOM_KIND_SERVER_LIST,
  buildBlossomCapabilityState,
  buildBlossomConfig,
  classifyBlossomMediaAllowance,
  normalizeBlossomServerUrl,
  normalizeBlossomServerUrls,
  normalizeKind10063ServerTags,
  normalizeMimeTypes,
  parseBlossomBoolean,
  parseBlossomPositiveNumber,
} from '@lib/media/blossomConfig';

describe('blossomConfig', () => {
  it('parses configured servers, MIME policy, booleans, and size limits', () => {
    const config = buildBlossomConfig({
      EVENTINEL_BLOSSOM_SERVERS: ' https://cdn.example.com/ , https://upload.example.com/path/ ',
      EVENTINEL_BLOSSOM_IMAGE_MIME_TYPES: 'image/jpeg, image/PNG',
      EVENTINEL_BLOSSOM_VIDEO_ENABLED: 'true',
      EVENTINEL_BLOSSOM_VIDEO_MIME_TYPES: 'video/mp4',
      EVENTINEL_BLOSSOM_MAX_BYTES: '2500000',
      EVENTINEL_BLOSSOM_USE_MEDIA_ENDPOINT: '1',
      EVENTINEL_BLOSSOM_MIRROR_ENABLED: 'yes',
    });

    expect(config).toEqual({
      appUploadServers: ['https://cdn.example.com', 'https://upload.example.com/path'],
      imageMimeTypes: ['image/jpeg', 'image/png'],
      videoEnabled: true,
      videoMimeTypes: ['video/mp4'],
      maxBytes: 2500000,
      useMediaEndpoint: true,
      mirrorEnabled: true,
    });
  });

  it('normalizes Blossom server URLs while preserving real base paths', () => {
    expect(normalizeBlossomServerUrl('https://upload.example.com')).toBe('https://upload.example.com');
    expect(normalizeBlossomServerUrl('https://upload.example.com/?x=1#hash')).toBe('https://upload.example.com');
    expect(normalizeBlossomServerUrl('https://upload.example.com/blossom/?x=1#hash')).toBe(
      'https://upload.example.com/blossom'
    );
    expect(normalizeBlossomServerUrl('http://upload.example.com/path')).toBe('http://upload.example.com/path');
    expect(normalizeBlossomServerUrl('https://upload.example.com/upload')).toBe('https://upload.example.com');
    expect(normalizeBlossomServerUrl('https://upload.example.com/upload/?x=1#hash')).toBe(
      'https://upload.example.com'
    );
    expect(normalizeBlossomServerUrl('https://upload.example.com/media#hash')).toBe('https://upload.example.com');
    expect(normalizeBlossomServerUrl('https://upload.example.com/blossom/upload?x=1#hash')).toBe(
      'https://upload.example.com/blossom'
    );
    expect(normalizeBlossomServerUrl('https://upload.example.com/blossom/media/')).toBe(
      'https://upload.example.com/blossom'
    );
    expect(normalizeBlossomServerUrl('ftp://upload.example.com/path')).toBeNull();
  });

  it('accepts JSON server arrays and removes invalid or duplicate entries', () => {
    expect(
      normalizeBlossomServerUrls(
        JSON.stringify(['https://cdn.example.com/', 'ftp://invalid.example.com', 'https://cdn.example.com'])
      )
    ).toEqual(['https://cdn.example.com']);
  });

  it('keeps safe defaults without hardcoded upload servers', () => {
    const config = buildBlossomConfig();

    expect(config.appUploadServers).toEqual([]);
    expect(config.imageMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    expect(config.videoEnabled).toBe(false);
    expect(config.maxBytes).toBeNull();
  });

  it('normalizes MIME lists and ignores malformed entries', () => {
    expect(normalizeMimeTypes(' IMAGE/JPEG, not-a-mime, image/webp, image/jpeg ')).toEqual([
      'image/jpeg',
      'image/webp',
    ]);
  });

  it('parses booleans and positive numbers without throwing', () => {
    expect(parseBlossomBoolean('on')).toBe(true);
    expect(parseBlossomBoolean('off', true)).toBe(false);
    expect(parseBlossomBoolean('unknown', true)).toBe(true);
    expect(parseBlossomPositiveNumber('42.9')).toBe(42);
    expect(parseBlossomPositiveNumber('-1')).toBeNull();
    expect(parseBlossomPositiveNumber('nope')).toBeNull();
  });

  it('builds a missing-upload-server state instead of throwing', () => {
    const capability = buildBlossomCapabilityState(buildBlossomConfig());

    expect(capability.status).toBe('missing-upload-server');
    expect(capability.uploadServers).toEqual([]);
  });

  it('allows configured image uploads', () => {
    const capability = buildBlossomCapabilityState(
      buildBlossomConfig({
        EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
      })
    );

    expect(
      classifyBlossomMediaAllowance(
        { type: 'image', mimeType: 'image/jpeg', fileSize: 1000 },
        capability
      )
    ).toEqual({
      allowed: true,
      mediaKind: 'image',
      mimeType: 'image/jpeg',
      uploadServers: [{ url: 'https://cdn.example.com', source: 'app-default' }],
    });
  });

  it('blocks video uploads by default', () => {
    const capability = buildBlossomCapabilityState(
      buildBlossomConfig({
        EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
      })
    );

    expect(
      classifyBlossomMediaAllowance(
        { type: 'video', mimeType: 'video/mp4', fileSize: 1000 },
        capability
      )
    ).toMatchObject({
      allowed: false,
      reason: 'video-disabled',
      mediaKind: 'video',
    });
  });

  it('rejects disallowed MIME types and oversized media', () => {
    const capability = buildBlossomCapabilityState(
      buildBlossomConfig({
        EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com',
        EVENTINEL_BLOSSOM_MAX_BYTES: '1000',
      })
    );

    expect(
      classifyBlossomMediaAllowance({ type: 'image', mimeType: 'image/heic', fileSize: 100 }, capability)
    ).toMatchObject({
      allowed: false,
      reason: 'mime-type-not-allowed',
    });

    expect(
      classifyBlossomMediaAllowance({ type: 'image', mimeType: 'image/png', fileSize: 1001 }, capability)
    ).toMatchObject({
      allowed: false,
      reason: 'file-too-large',
    });
  });

  it('normalizes kind:10063 server tags for user-published fallback servers', () => {
    const tags = [
      ['server', 'https://fallback.example.com/'],
      ['server', 'notaurl'],
      ['relay', 'wss://relay.example.com'],
      ['server', 'https://fallback.example.com'],
      ['server', 'https://second.example.com/path?ignored=true#hash'],
      ['server', 'https://api.example.com/upload/?ignored=true#hash'],
      ['server', 'https://api.example.com/media'],
      ['server', 'https://media.example.com/blossom/media?ignored=true#hash'],
    ];

    expect(BLOSSOM_KIND_SERVER_LIST).toBe(10063);
    expect(normalizeKind10063ServerTags(tags)).toEqual([
      'https://fallback.example.com',
      'https://second.example.com/path',
      'https://api.example.com',
      'https://media.example.com/blossom',
    ]);
  });

  it('prioritizes current user kind:10063 servers before app defaults without repeating duplicates', () => {
    const config = buildBlossomConfig({
      EVENTINEL_BLOSSOM_SERVERS: 'https://app.example.com, https://shared.example.com',
    });
    const userServers = normalizeKind10063ServerTags([
      ['server', 'https://shared.example.com'],
      ['server', 'https://user.example.com'],
      ['server', 'https://user.example.com/'],
    ]);

    expect(buildBlossomCapabilityState(config, userServers).uploadServers).toEqual([
      { url: 'https://shared.example.com', source: 'user-kind-10063' },
      { url: 'https://user.example.com', source: 'user-kind-10063' },
      { url: 'https://app.example.com', source: 'app-default' },
    ]);
  });

  it('intersects configured policy with BUD-06-style server capabilities when present', () => {
    const capability = buildBlossomCapabilityState(
      buildBlossomConfig({
        EVENTINEL_BLOSSOM_SERVERS: 'https://app.example.com',
        EVENTINEL_BLOSSOM_VIDEO_ENABLED: 'true',
        EVENTINEL_BLOSSOM_MAX_BYTES: '5000',
      }),
      [],
      {
        acceptedMimeTypes: 'image/png',
        maxBytes: '3000',
      }
    );

    expect(capability.allowedMimeTypes).toEqual(['image/png']);
    expect(capability.videoUploadEnabled).toBe(false);
    expect(capability.maxBytes).toBe(3000);
  });

  it('matches server MIME wildcards against configured concrete media policy', () => {
    const capability = buildBlossomCapabilityState(
      buildBlossomConfig({
        EVENTINEL_BLOSSOM_SERVERS: 'https://app.example.com',
        EVENTINEL_BLOSSOM_IMAGE_MIME_TYPES: 'image/jpeg, image/png',
        EVENTINEL_BLOSSOM_VIDEO_ENABLED: 'true',
        EVENTINEL_BLOSSOM_VIDEO_MIME_TYPES: 'video/mp4, video/webm',
      }),
      [],
      {
        acceptedMimeTypes: 'image/*, video/*, audio/*, image/jp*g',
      }
    );

    expect(capability.allowedMimeTypes).toEqual(['image/jpeg', 'image/png', 'video/mp4', 'video/webm']);
    expect(capability.videoUploadEnabled).toBe(true);
  });
});
