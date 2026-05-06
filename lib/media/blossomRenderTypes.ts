export type BlossomRenderSource = 'imeta' | 'tags' | 'content-url';
export type BlossomRenderKind = 'image' | 'video' | 'link';
export type BlossomRenderStatus = 'renderable' | 'blocked' | 'invalid';

export type BlossomRenderReason =
  | 'invalid-url'
  | 'missing-mime-type'
  | 'unsupported-mime-type'
  | 'video-unsupported';

export type BlossomMediaDescriptor = {
  id: string;
  url: string;
  sha256?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  source: BlossomRenderSource;
  renderKind: BlossomRenderKind;
  status: BlossomRenderStatus;
  reason?: BlossomRenderReason;
  fallbackUrls: string[];
};

export type BlossomHashFromUrl = {
  sha256: string;
  extension: string | null;
};

export type BuildBlossomFallbackUrlsParams = {
  serverUrls: readonly string[];
  sha256: string;
  extension?: string | null;
  originalUrl?: string | null;
};

export type ParseBlossomMediaFromEventParams = {
  content?: string | null;
  tags?: readonly (readonly string[])[];
  authorBlossomServerUrls?: readonly string[];
};

export type BlossomSha256Digest = (bytes: Uint8Array) => Promise<string>;
export type BlossomFetchBytes = (url: string, signal?: AbortSignal) => Promise<Uint8Array>;

export type BlossomSha256VerificationResult =
  | {
      ok: true;
      sha256: string;
    }
  | {
      ok: false;
      reason: 'invalid-expected-sha256' | 'invalid-digest' | 'sha256-mismatch' | 'digest-failed';
      expectedSha256: string;
      actualSha256?: string;
      message?: string;
    };

export type FetchBlossomMediaAttempt = {
  url: string;
  reason: 'invalid-url' | 'fetch-failed' | 'invalid-digest' | 'sha256-mismatch' | 'digest-failed';
  actualSha256?: string;
  message?: string;
};

export type FetchAndVerifyBlossomMediaParams = {
  url?: string | null;
  fallbackUrls?: readonly string[];
  candidateUrls?: readonly string[];
  expectedSha256: string;
  mimeType?: string | null;
  fetchBytes?: BlossomFetchBytes;
  digest?: BlossomSha256Digest;
  signal?: AbortSignal;
};

export type FetchAndVerifyBlossomMediaResult =
  | {
      ok: true;
      url: string;
      sha256: string;
      mimeType: string;
      dataUri: string;
      attemptedUrls: string[];
    }
  | {
      ok: false;
      reason: 'invalid-expected-sha256' | 'no-candidate-urls' | 'all-candidates-failed';
      attemptedUrls: string[];
      attempts: FetchBlossomMediaAttempt[];
      message: string;
    };

export type ResolveBlossomDisplayUrlOptions = {
  platform?: string;
  androidLoopbackHost?: string;
};

type RawBlossomMediaCandidate = {
  url: string;
  sha256?: string | null;
  mimeType?: string | null;
  size?: string | number | null;
  dim?: string | null;
  source: BlossomRenderSource;
};

type RenderDecision = {
  renderKind: BlossomRenderKind;
  status: BlossomRenderStatus;
  reason?: BlossomRenderReason;
};
