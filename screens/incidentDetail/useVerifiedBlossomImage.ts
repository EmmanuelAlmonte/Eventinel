import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

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
  }, [candidateUrls, expectedSha256, mimeType]);

  return state;
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
