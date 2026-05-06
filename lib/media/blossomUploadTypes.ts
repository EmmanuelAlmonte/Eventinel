import type { BlossomCapabilityState, BlossomMediaRejectionReason, BlossomServer } from './blossomConfig';
import type { PickedMedia } from './pickMedia';

export const BLOSSOM_UPLOAD_AUTH_KIND = 24242 as const;

export type JsonRecord = Record<string, unknown>;

export type BlossomUploadMedia = PickedMedia;

export type BlossomUploadAuthVerb = 'upload' | 'media';

export type BlossomUnsignedAuthEvent = {
  kind: typeof BLOSSOM_UPLOAD_AUTH_KIND;
  content: string;
  created_at: number;
  tags: string[][];
};

export type BlossomSignedAuthEvent = BlossomUnsignedAuthEvent & {
  id?: string;
  pubkey?: string;
  sig?: string;
  [key: string]: unknown;
};

export type BlossomAuthSigner = (event: BlossomUnsignedAuthEvent) => Promise<BlossomSignedAuthEvent>;

export type BlossomReadFileBytes = (fileUri: string) => Promise<Uint8Array>;

export type BlossomSha256Digest = (bytes: Uint8Array) => Promise<string>;

export type BlossomRetryPolicy = {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
};

export type BlossomUploadProgress = {
  stage: 'uploading';
  attempt: number;
  loadedBytes: number;
  totalBytes: number | null;
  fraction: number | null;
};

export type BlossomUploadTransportProgress = {
  loadedBytes: number;
  totalBytes?: number | null;
};

export type BlossomUploadTransportRequest = {
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  body: Uint8Array;
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: BlossomUploadTransportProgress) => void;
};

export type BlossomUploadTransportResponse = {
  status: number;
  headers?: Record<string, string> | Headers | null;
  body?: unknown;
};

export type BlossomUploadTransport = (
  request: BlossomUploadTransportRequest
) => Promise<BlossomUploadTransportResponse>;

export type BlossomBlobDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  nip94?: unknown;
};

export type BlossomUploadedMedia = {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded: number;
  server: BlossomServer;
  sourceServerUrl: string;
  endpoint: '/upload' | '/media';
  mediaKind: 'image' | 'video';
  source: {
    uri: string;
    fileName?: string;
    width?: number;
    height?: number;
    duration?: number;
  };
  descriptor: BlossomBlobDescriptor;
};

export type BlossomUploadValidationError = {
  type: 'validation';
  reason: BlossomMediaRejectionReason;
  message: string;
  retryable: false;
};

export type BlossomUploadAuthMissingError = {
  type: 'auth-missing';
  message: string;
  retryable: false;
};

export type BlossomUploadAuthFailedError = {
  type: 'auth-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadServerRejectedError = {
  type: 'server-rejected';
  status: number;
  message: string;
  reason: string | null;
  body: string | null;
  retryable: boolean;
};

export type BlossomUploadNetworkError = {
  type: 'network';
  message: string;
  retryable: true;
};

export type BlossomUploadTimeoutError = {
  type: 'timeout';
  message: string;
  retryable: true;
};

export type BlossomUploadRetryExhaustedError = {
  type: 'retry-exhausted';
  message: string;
  attempts: number;
  lastError:
    | BlossomUploadNetworkError
    | BlossomUploadTimeoutError
    | BlossomUploadServerRejectedError;
  retryable: false;
};

export type BlossomUploadCancelledError = {
  type: 'cancelled';
  message: string;
  retryable: false;
};

export type BlossomUploadReadFailedError = {
  type: 'file-read-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadHashFailedError = {
  type: 'hash-failed';
  message: string;
  retryable: false;
};

export type BlossomUploadInvalidResponseError = {
  type: 'invalid-response';
  status: number;
  message: string;
  body: string | null;
  retryable: false;
};

export type BlossomUploadError =
  | BlossomUploadValidationError
  | BlossomUploadAuthMissingError
  | BlossomUploadAuthFailedError
  | BlossomUploadServerRejectedError
  | BlossomUploadNetworkError
  | BlossomUploadTimeoutError
  | BlossomUploadRetryExhaustedError
  | BlossomUploadCancelledError
  | BlossomUploadReadFailedError
  | BlossomUploadHashFailedError
  | BlossomUploadInvalidResponseError;

export type BlossomUploadOutcome =
  | {
      ok: true;
      result: BlossomUploadedMedia;
    }
  | {
      ok: false;
      error: BlossomUploadError;
    };

export type BlossomUploadParams = {
  media: BlossomUploadMedia;
  capability: BlossomCapabilityState;
  server?: BlossomServer;
  signal?: AbortSignal;
  onProgress?: (progress: BlossomUploadProgress) => void;
  signer?: BlossomAuthSigner;
  readFileBytes?: BlossomReadFileBytes;
  sha256Digest?: BlossomSha256Digest;
  transport?: BlossomUploadTransport;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  retry?: BlossomRetryPolicy;
  timeoutMs?: number;
  authExpirationSeconds?: number;
};

export class BlossomDefaultAuthMissing extends Error {}

export class BlossomTransportFailure extends Error {
  constructor(
    readonly failureType: 'network' | 'timeout' | 'cancelled',
    message: string
  ) {
    super(message);
  }
}
