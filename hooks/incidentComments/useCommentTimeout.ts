import { useEffect, useRef, useState } from 'react';
import type { NDKFilter } from '@nostr-dev-kit/mobile';

type UseCommentTimeoutOptions = {
  filters: NDKFilter[] | false;
  eventsLength: number;
  eose: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 3000;

export function useCommentTimeout({
  filters,
  eventsLength,
  eose,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseCommentTimeoutOptions): boolean {
  const [didTimeout, setDidTimeout] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!filters) return undefined;

    setDidTimeout(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      setDidTimeout(true);
    }, timeoutMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [filters, timeoutMs]);

  useEffect(() => {
    if (!filters) return;
    if (!eose && eventsLength === 0) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [eventsLength, eose, filters]);

  return didTimeout;
}
