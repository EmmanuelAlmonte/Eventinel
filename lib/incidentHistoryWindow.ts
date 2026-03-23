import AsyncStorage from '@react-native-async-storage/async-storage';

import { INCIDENT_LIMITS } from '@lib/map/constants';

const INCIDENT_HISTORY_WINDOW_STORAGE_KEY = 'eventinel:incident-history-window-days';

export const INCIDENT_HISTORY_WINDOW_PRESETS = [1, 3, 7, 30] as const;

export type IncidentHistoryWindowPreset = (typeof INCIDENT_HISTORY_WINDOW_PRESETS)[number];

export const DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS = INCIDENT_LIMITS.SINCE_DAYS;

export interface IncidentHistoryWindowLoadResult {
  days: number;
  persistedDays: number | null;
}

export function isValidIncidentHistoryWindowPreset(
  value: number
): value is IncidentHistoryWindowPreset {
  return INCIDENT_HISTORY_WINDOW_PRESETS.includes(value as IncidentHistoryWindowPreset);
}

export function normalizeIncidentHistoryWindowDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS;
  }

  const normalized = Math.floor(value);
  return isValidIncidentHistoryWindowPreset(normalized)
    ? normalized
    : DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS;
}

export function calculateIncidentSinceUnixSeconds(
  sinceDays: number,
  nowMs = Date.now()
): number {
  const normalizedDays = normalizeIncidentHistoryWindowDays(sinceDays);
  return Math.max(0, Math.floor(nowMs / 1000) - normalizedDays * 86400);
}

export function createIncidentHistoryWindowSaveCoordinator(
  saveDays: (days: number) => Promise<number>,
  initialDays: number = DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
) {
  let lastRequestedDays = normalizeIncidentHistoryWindowDays(initialDays);
  let lastPersistedDays: number | null = lastRequestedDays;
  let queue: Promise<number> = Promise.resolve(lastRequestedDays);

  return {
    hydrate(days: number, persistedDays: number | null = days): number {
      const normalized = normalizeIncidentHistoryWindowDays(days);
      lastRequestedDays = normalized;
      lastPersistedDays =
        persistedDays === null ? null : normalizeIncidentHistoryWindowDays(persistedDays);
      return normalized;
    },
    enqueue(days: number) {
      const normalizedDays = normalizeIncidentHistoryWindowDays(days);
      lastRequestedDays = normalizedDays;

      const persistLatestSelection = async () => {
        while (lastPersistedDays !== lastRequestedDays) {
          const nextDays = lastRequestedDays;
          const persisted = await saveDays(nextDays);
          lastPersistedDays = persisted;
        }

        return lastRequestedDays;
      };

      queue = queue.then(persistLatestSelection, persistLatestSelection);

      return {
        normalizedDays,
        pending: queue,
      };
    },
  };
}

export async function loadIncidentHistoryWindowState(): Promise<IncidentHistoryWindowLoadResult> {
  try {
    const stored = await AsyncStorage.getItem(INCIDENT_HISTORY_WINDOW_STORAGE_KEY);
    if (!stored) {
      return {
        days: DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS,
        persistedDays: null,
      };
    }

    const normalized = normalizeIncidentHistoryWindowDays(JSON.parse(stored));
    return {
      days: normalized,
      persistedDays: normalized,
    };
  } catch (error) {
    console.warn('[IncidentHistoryWindow] Failed to load setting:', error);
    return {
      days: DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS,
      persistedDays: null,
    };
  }
}

export async function loadIncidentHistoryWindowDays(): Promise<number> {
  const { days } = await loadIncidentHistoryWindowState();
  return days;
}

export async function saveIncidentHistoryWindowDays(days: number): Promise<number> {
  const normalized = normalizeIncidentHistoryWindowDays(days);
  await AsyncStorage.setItem(
    INCIDENT_HISTORY_WINDOW_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}
