import { Buffer } from 'buffer';

import type { BlossomCapabilityState } from './blossomConfig';
import {
  BLOSSOM_UPLOAD_AUTH_KIND,
  BlossomDefaultAuthMissing,
  type BlossomSignedAuthEvent,
  type BlossomUnsignedAuthEvent,
  type BlossomUploadAuthVerb,
} from './blossomUploadTypes';

const DEFAULT_AUTH_EXPIRATION_SECONDS = 5 * 60;

export function resolveBlossomUploadEndpoint(capability: BlossomCapabilityState): '/upload' | '/media' {
  return capability.useMediaEndpoint ? '/media' : '/upload';
}

export function resolveBlossomAuthVerb(endpoint: '/upload' | '/media'): BlossomUploadAuthVerb {
  return endpoint === '/media' ? 'media' : 'upload';
}

export function resolveBlossomServerAuthTag(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname.toLowerCase();
  } catch {
    return serverUrl.trim().split(':')[0].toLowerCase();
  }
}

export function buildBlossomUploadUrl(serverUrl: string, endpoint: '/upload' | '/media'): string {
  const parsed = new URL(serverUrl);
  return `${parsed.origin}${endpoint}`;
}

export function buildBlossomAuthEventTemplate(params: {
  authVerb: BlossomUploadAuthVerb;
  sha256: string;
  serverUrl: string;
  nowUnixSeconds: number;
  expirationSeconds?: number;
}): BlossomUnsignedAuthEvent {
  const expirationSeconds = params.expirationSeconds ?? DEFAULT_AUTH_EXPIRATION_SECONDS;
  return {
    kind: BLOSSOM_UPLOAD_AUTH_KIND,
    content: `Authorize Blossom ${params.authVerb}`,
    created_at: params.nowUnixSeconds,
    tags: [
      ['t', params.authVerb],
      ['expiration', String(params.nowUnixSeconds + expirationSeconds)],
      ['x', params.sha256],
      ['server', resolveBlossomServerAuthTag(params.serverUrl)],
    ],
  };
}

export function encodeBlossomAuthHeader(event: BlossomSignedAuthEvent): string {
  const payload = Buffer.from(JSON.stringify(event), 'utf8').toString('base64');
  const base64url = payload.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `Nostr ${base64url}`;
}

export async function signWithDefaultNdkSigner(event: BlossomUnsignedAuthEvent): Promise<BlossomSignedAuthEvent> {
  const [{ ndk }, mobile] = await Promise.all([import('@lib/ndk'), import('@nostr-dev-kit/mobile')]);
  const signer = (ndk as { signer?: unknown }).signer as
    | {
        blockUntilReady?: () => Promise<unknown>;
        sign?: (event: unknown) => Promise<unknown>;
      }
    | undefined;

  if (!signer) {
    throw new BlossomDefaultAuthMissing('No Nostr signer is available for Blossom upload authorization.');
  }

  if (signer.blockUntilReady) await signer.blockUntilReady();

  const EventCtor = (mobile as { NDKEvent?: new (ndk: unknown) => unknown }).NDKEvent;
  if (EventCtor) {
    const authEvent = new EventCtor(ndk) as {
      kind: number;
      content: string;
      created_at: number;
      tags: string[][];
      sign?: () => Promise<void>;
      rawEvent?: () => unknown;
      id?: string;
      pubkey?: string;
      sig?: string;
    };
    authEvent.kind = event.kind;
    authEvent.content = event.content;
    authEvent.created_at = event.created_at;
    authEvent.tags = event.tags;
    await authEvent.sign?.();
    const raw = authEvent.rawEvent?.() ?? {
      ...event,
      id: authEvent.id,
      pubkey: authEvent.pubkey,
      sig: authEvent.sig,
    };
    if (isSignedAuthEvent(raw)) return raw;
  }

  if (typeof signer.sign === 'function') {
    const signed = await signer.sign(event);
    if (isSignedAuthEvent(signed)) return signed;
  }

  throw new Error('Nostr signer did not return a signed Blossom authorization event.');
}

export async function readFileBytesWithExpoFileSystem(fileUri: string): Promise<Uint8Array> {
  const { File } = await import('expo-file-system');
  const file = new File(fileUri);
  return file.bytes();
}

export async function sha256HexWithExpoCrypto(bytes: Uint8Array): Promise<string> {
  const Crypto = await import('expo-crypto');
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return arrayBufferToHex(digest);
}

export function normalizeSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('SHA-256 digest must be a 64-character lowercase hex string.');
  }
  return normalized;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isSignedAuthEvent(value: unknown): value is BlossomSignedAuthEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as BlossomSignedAuthEvent).kind === BLOSSOM_UPLOAD_AUTH_KIND &&
    Array.isArray((value as BlossomSignedAuthEvent).tags)
  );
}
