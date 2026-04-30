import type { NDKFilter } from '@nostr-dev-kit/mobile';

interface BuildIncidentSubscriptionFilterOptions {
  enabled: boolean;
  geohashGrid: string[] | null;
  limit: number;
  since?: number | null;
}

export function buildIncidentSubscriptionFilter({
  enabled,
  geohashGrid,
  limit,
  since,
}: BuildIncidentSubscriptionFilterOptions): NDKFilter[] | false {
  if (!enabled) {
    return false;
  }

  if (geohashGrid && geohashGrid.length > 0) {
    return [
      {
        kinds: [30911 as number],
        '#g': geohashGrid,
        limit,
        ...(since != null ? { since } : {}),
      },
    ];
  }

  return [
    {
      kinds: [30911 as number],
      limit,
      ...(since != null ? { since } : {}),
    },
  ];
}

export function buildIncidentFilterKey({
  enabled,
  geohashGrid,
  limit,
  since,
}: BuildIncidentSubscriptionFilterOptions): string {
  if (!enabled) {
    return 'disabled';
  }

  if (geohashGrid && geohashGrid.length > 0) {
    return `g:${geohashGrid.join('|')}:limit:${limit}:since:${since ?? 'none'}`;
  }

  return `global:${limit}:since:${since ?? 'none'}`;
}
