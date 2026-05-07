import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { buildBlossomConfig } from '@lib/media/blossomConfig';
import {
  fetchAndVerifyBlossomMedia,
  resolveBlossomDisplayUrl,
  type BlossomMediaDescriptor,
} from '@lib/media/blossomRender';

type VerifiedBlossomImageState =
  | {
      status: 'loading';
      uri: null;
    }
  | {
      status: 'ready';
      uri: string;
    }
  | {
      status: 'failed';
      uri: null;
    };

export function useVerifiedBlossomImage(media: BlossomMediaDescriptor): VerifiedBlossomImageState {
  const candidateUrls = useMemo(() => buildDisplayCandidateUrls(media), [media]);
  const expectedSha256 = media.sha256;
  const maxBytes = getBlossomRenderMaxBytes(media.size);
  const mimeType = media.mimeType;
  const [state, setState] = useState<VerifiedBlossomImageState>({ status: 'loading', uri: null });

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    if (!expectedSha256) {
      setState({ status: 'failed', uri: null });
      return () => {
        isActive = false;
        controller.abort();
      };
    }

    setState({ status: 'loading', uri: null });

    fetchAndVerifyBlossomMedia({
      candidateUrls,
      expectedSha256,
      ...(maxBytes === undefined ? {} : { maxBytes }),
      mimeType,
      signal: controller.signal,
    })
      .then((outcome) => {
        if (!isActive) return;
        setState(outcome.ok ? { status: 'ready', uri: outcome.dataUri } : { status: 'failed', uri: null });
      })
      .catch(() => {
        if (!isActive) return;
        setState({ status: 'failed', uri: null });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [candidateUrls, expectedSha256, maxBytes, mimeType]);

  return state;
}

function getBlossomRenderMaxBytes(mediaSize?: number): number | undefined {
  const configuredMaxBytes = buildBlossomConfig({
    ...process.env,
    ...(Constants?.expoConfig?.extra ?? {}),
  }).maxBytes;

  return configuredMaxBytes ?? normalizePositiveInteger(mediaSize);
}

function normalizePositiveInteger(value?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
}

function buildDisplayCandidateUrls(media: BlossomMediaDescriptor): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const url of [media.url, ...media.fallbackUrls]) {
    const displayUrl = resolveBlossomDisplayUrl(url, { platform: Platform.OS });
    if (!displayUrl || seen.has(displayUrl)) continue;
    seen.add(displayUrl);
    urls.push(displayUrl);
  }

  return urls;
}
