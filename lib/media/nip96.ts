import { Buffer } from 'buffer';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/mobile';

import { ndk } from '@lib/ndk';

export type Nip96UploadResult = {
  url: string;
  response: any;
};

function getFirstString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function coerceUploadUrl(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;

  return (
    getFirstString(payload.url) ||
    getFirstString(payload.download_url) ||
    getFirstString(payload.downloadUrl) ||
    getFirstString(payload.file_url) ||
    getFirstString(payload.fileUrl) ||
    null
  );
}

async function tryBuildNip98AuthHeader(url: string, method: string): Promise<string | null> {
  if (!ndk.signer) return null;

  const auth = new NDKEvent(ndk);
  auth.kind = NDKKind.HttpAuth;
  auth.created_at = Math.floor(Date.now() / 1000);
  auth.tags = [
    ['u', url],
    ['method', method.toUpperCase()],
  ];
  auth.content = '';

  await auth.sign();
  const raw = auth.rawEvent();
  const b64 = Buffer.from(JSON.stringify(raw)).toString('base64');
  return `Nostr ${b64}`;
}

export async function uploadToNip96(params: {
  endpoint: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
}): Promise<Nip96UploadResult> {
  const { endpoint, fileUri, fileName, mimeType } = params;

  const form = new FormData();
  form.append(
    'file',
    {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any
  );

  const auth = await tryBuildNip98AuthHeader(endpoint, 'POST');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: auth ? { Authorization: auth } : undefined,
    body: form,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message) ||
      (typeof payload === 'string' && payload) ||
      `Upload failed (${res.status})`;
    throw new Error(message);
  }

  const url = typeof payload === 'object' ? coerceUploadUrl(payload) : null;
  if (!url) {
    throw new Error('Upload succeeded but no URL returned by server');
  }

  return { url, response: payload };
}

