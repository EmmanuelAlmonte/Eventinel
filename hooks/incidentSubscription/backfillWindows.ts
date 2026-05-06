import type { NDKSubscription } from '@nostr-dev-kit/mobile';

const SECONDS_PER_DAY = 86400;
const DEFAULT_BOUNDARIES_DAYS = [0, 1, 2, 3, 5, 7, 14, 30] as const;

export type IncidentBackfillStopReason =
  | 'capacity'
  | 'complete'
  | 'coverage-change'
  | 'disabled'
  | 'empty-coverage'
  | 'history-window-change'
  | 'unmount';

export interface IncidentBackfillWindow {
  index: number;
  key: string;
  since: number;
  until: number | null;
  startAgeDays: number;
  endAgeDays: number;
  isLiveWindow: boolean;
}

export interface IncidentBackfillRuntime {
  epoch: number;
  planKey: string;
  windows: IncidentBackfillWindow[];
  nextWindowIndex: number;
  activeWindowIndex: number | null;
  activeSubscriptions: Map<string, NDKSubscription>;
  stopReason: IncidentBackfillStopReason | null;
}

export function createIncidentBackfillRuntime(): IncidentBackfillRuntime {
  return {
    epoch: 0,
    planKey: 'disabled',
    windows: [],
    nextWindowIndex: 1,
    activeWindowIndex: null,
    activeSubscriptions: new Map(),
    stopReason: null,
  };
}

export function resetIncidentBackfillRuntime({
  runtime,
  planKey,
  windows,
  stopReason,
}: {
  runtime: IncidentBackfillRuntime;
  planKey: string;
  windows: IncidentBackfillWindow[];
  stopReason: IncidentBackfillStopReason | null;
}): void {
  runtime.epoch += 1;
  runtime.planKey = planKey;
  runtime.windows = windows;
  runtime.nextWindowIndex = 1;
  runtime.activeWindowIndex = null;
  runtime.stopReason = stopReason;
}

function normalizeSinceDays(sinceDays: number): number {
  return Number.isFinite(sinceDays) && sinceDays > 0
    ? Math.max(1, Math.floor(sinceDays))
    : 1;
}

function buildBoundaries(sinceDays: number): number[] {
  const normalizedSinceDays = normalizeSinceDays(sinceDays);
  return Array.from(
    new Set(
      [...DEFAULT_BOUNDARIES_DAYS, normalizedSinceDays].filter(
        (days) => days <= normalizedSinceDays
      )
    )
  ).sort((left, right) => left - right);
}

export function buildIncidentBackfillWindows({
  sinceDays,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
}: {
  sinceDays: number;
  nowUnixSeconds?: number;
}): IncidentBackfillWindow[] {
  const boundaries = buildBoundaries(sinceDays);
  const windows: IncidentBackfillWindow[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startAgeDays = boundaries[index];
    const endAgeDays = boundaries[index + 1];
    if (endAgeDays <= startAgeDays) {
      continue;
    }

    const since = nowUnixSeconds - endAgeDays * SECONDS_PER_DAY;
    const until = startAgeDays === 0 ? null : nowUnixSeconds - startAgeDays * SECONDS_PER_DAY;
    windows.push({
      index,
      key: `${startAgeDays}d-${endAgeDays}d`,
      since,
      until,
      startAgeDays,
      endAgeDays,
      isLiveWindow: index === 0,
    });
  }

  return windows;
}

export function buildIncidentBackfillSubscriptionKey({
  epoch,
  groupKey,
  window,
}: {
  epoch: number;
  groupKey: string;
  window: IncidentBackfillWindow;
}): string {
  return `backfill:${epoch}:${window.key}:${groupKey}`;
}

export function getLiveIncidentWindow(sinceDays: number): IncidentBackfillWindow {
  return (
    buildIncidentBackfillWindows({ sinceDays })[0] ?? {
      index: 0,
      key: '0d-1d',
      since: Math.floor(Date.now() / 1000) - SECONDS_PER_DAY,
      until: null,
      startAgeDays: 0,
      endAgeDays: 1,
      isLiveWindow: true,
    }
  );
}
