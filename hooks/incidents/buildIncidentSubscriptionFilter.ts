import type { NDKFilter } from '@nostr-dev-kit/mobile';

interface BuildIncidentSubscriptionFilterOptions {
  enabled: boolean;
  geohashGrid9: string[] | null;
  limit: number;
}

export function buildIncidentSubscriptionFilter({
  enabled,
  geohashGrid9,
  limit,
}: BuildIncidentSubscriptionFilterOptions): NDKFilter[] | false {
  if (!enabled) {
    return false;
  }

  if (geohashGrid9 && geohashGrid9.length > 0) {
    return [
      {
        kinds: [30911 as number],
        '#g': geohashGrid9,
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
  geohashGrid9,
  limit,
}: BuildIncidentSubscriptionFilterOptions): string {
  if (!enabled) {
    return 'disabled';
  }

  if (geohashGrid9 && geohashGrid9.length > 0) {
    return `g9:${geohashGrid9.join('|')}:limit:${limit}`;
  }

  return `global:${limit}`;
}
