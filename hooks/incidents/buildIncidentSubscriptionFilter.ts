import type { NDKFilter } from '@nostr-dev-kit/mobile';

interface BuildIncidentSubscriptionFilterOptions {
  enabled: boolean;
  geohashGrid: string[] | null;
  limit: number;
}

export function buildIncidentSubscriptionFilter({
  enabled,
  geohashGrid,
  limit,
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
      },
    ];
  }

  return [
    {
      kinds: [30911 as number],
      limit,
    },
  ];
}

export function buildIncidentFilterKey({
  enabled,
  geohashGrid,
  limit,
}: BuildIncidentSubscriptionFilterOptions): string {
  if (!enabled) {
    return 'disabled';
  }

  if (geohashGrid && geohashGrid.length > 0) {
    return `g:${geohashGrid.join('|')}:limit:${limit}`;
  }

  return `global:${limit}`;
}
