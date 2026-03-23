import AsyncStorage from '@react-native-async-storage/async-storage';

import { INCIDENT_LIMITS } from '@lib/map/constants';

const INCIDENT_HISTORY_WINDOW_STORAGE_KEY = 'eventinel:incident-history-window-days';

export const INCIDENT_HISTORY_WINDOW_PRESETS = [1, 3, 7, 30] as const;

export type IncidentHistoryWindowPreset = (typeof INCIDENT_HISTORY_WINDOW_PRESETS)[number];

export const DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS = INCIDENT_LIMITS.SINCE_DAYS;

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
  let lastPersistedDays = lastRequestedDays;
  let queue = Promise.resolve();

  return {
    hydrate(days: number): number {
      const normalized = normalizeIncidentHistoryWindowDays(days);
      lastRequestedDays = normalized;
      lastPersistedDays = normalized;
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
      };

      queue = queue.then(persistLatestSelection, persistLatestSelection);

      return {
        normalizedDays,
        pending: queue,
      };
    },
  };
}

export async function loadIncidentHistoryWindowDays(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(INCIDENT_HISTORY_WINDOW_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS;
    }

    return normalizeIncidentHistoryWindowDays(JSON.parse(stored));
  } catch (error) {
    console.warn('[IncidentHistoryWindow] Failed to load setting:', error);
    return DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS;
  }
}

export async function saveIncidentHistoryWindowDays(days: number): Promise<number> {
  const normalized = normalizeIncidentHistoryWindowDays(days);
  await AsyncStorage.setItem(
    INCIDENT_HISTORY_WINDOW_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}
