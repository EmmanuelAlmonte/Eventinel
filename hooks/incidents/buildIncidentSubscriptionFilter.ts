import type { NDKFilter } from '@nostr-dev-kit/mobile';

interface BuildIncidentSubscriptionFilterOptions {
  enabled: boolean;
  geohashGrid: string[] | null;
  limit: number;
  cellCatchUpLimit?: number | null;
  since?: number | null;
  until?: number | null;
}

export function buildIncidentSubscriptionFilter({
  enabled,
  geohashGrid,
  limit,
  cellCatchUpLimit,
  since,
  until,
}: BuildIncidentSubscriptionFilterOptions): NDKFilter[] | false {
  if (!enabled) {
    return false;
  }

  if (geohashGrid && geohashGrid.length > 0) {
    const boundedCellCatchUpLimit =
      cellCatchUpLimit != null &&
      Number.isFinite(cellCatchUpLimit) &&
      cellCatchUpLimit > 0
        ? Math.max(1, Math.floor(cellCatchUpLimit))
        : null;
    const groupedFilter: NDKFilter = {
      kinds: [30911 as number],
      '#g': geohashGrid,
      limit,
      ...(since != null ? { since } : {}),
      ...(until != null ? { until } : {}),
    };

    if (geohashGrid.length <= 1 || boundedCellCatchUpLimit == null) {
      return [groupedFilter];
    }

    const cellCatchUpFilters: NDKFilter[] = geohashGrid.map((cell) => ({
      kinds: [30911 as number],
      '#g': [cell],
      limit: boundedCellCatchUpLimit,
      ...(since != null ? { since } : {}),
      ...(until != null ? { until } : {}),
    }));

    return [groupedFilter, ...cellCatchUpFilters];
  }

  return [
    {
      kinds: [30911 as number],
      limit,
      ...(since != null ? { since } : {}),
      ...(until != null ? { until } : {}),
    },
  ];
}

export function buildIncidentFilterKey({
  enabled,
  geohashGrid,
  limit,
  cellCatchUpLimit,
  since,
  until,
}: BuildIncidentSubscriptionFilterOptions): string {
  if (!enabled) {
    return 'disabled';
  }

  if (geohashGrid && geohashGrid.length > 0) {
    return `g:${geohashGrid.join('|')}:limit:${limit}:cellLimit:${cellCatchUpLimit ?? 'none'}:since:${since ?? 'none'}:until:${until ?? 'none'}`;
  }

  return `global:${limit}:since:${since ?? 'none'}:until:${until ?? 'none'}`;
}
