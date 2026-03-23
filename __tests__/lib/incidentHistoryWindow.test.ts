import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createIncidentHistoryWindowSaveCoordinator,
  DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS,
  INCIDENT_HISTORY_WINDOW_PRESETS,
  calculateIncidentSinceUnixSeconds,
  loadIncidentHistoryWindowDays,
  normalizeIncidentHistoryWindowDays,
  saveIncidentHistoryWindowDays,
} from '../../lib/incidentHistoryWindow';

jest.mock('@react-native-async-storage/async-storage');

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const STORAGE_KEY = 'eventinel:incident-history-window-days';

describe('lib/incidentHistoryWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
  });

  it('exports the expected presets', () => {
    expect(INCIDENT_HISTORY_WINDOW_PRESETS).toEqual([1, 3, 7, 30]);
  });

  it('loads the default when no value is stored', async () => {
    await expect(loadIncidentHistoryWindowDays()).resolves.toBe(
      DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
    );
  });

  it('loads a valid stored preset', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(7));

    await expect(loadIncidentHistoryWindowDays()).resolves.toBe(7);
  });

  it('falls back to the default when the stored value is invalid', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(99));

    await expect(loadIncidentHistoryWindowDays()).resolves.toBe(
      DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
    );
  });

  it('normalizes and saves the selected preset', async () => {
    await expect(saveIncidentHistoryWindowDays(3)).resolves.toBe(3);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(3)
    );
  });

  it('normalizes invalid values back to the default when saving', async () => {
    await expect(saveIncidentHistoryWindowDays(999)).resolves.toBe(
      DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
    );
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS)
    );
  });

  it('computes a deterministic since timestamp from days', () => {
    const fixedNowMs = 1_735_689_600_000;

    expect(calculateIncidentSinceUnixSeconds(3, fixedNowMs)).toBe(1735430400);
  });

  it('serializes saves so the last requested window wins', async () => {
    let resolveFirst!: (value: number) => void;
    let resolveSecond!: (value: number) => void;

    const firstPromise = new Promise<number>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<number>((resolve) => {
      resolveSecond = resolve;
    });

    const saveDays = jest
      .fn<Promise<number>, [number]>()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const coordinator = createIncidentHistoryWindowSaveCoordinator(saveDays, 7);
    const firstRequest = coordinator.enqueue(1);
    await Promise.resolve();

    expect(firstRequest.normalizedDays).toBe(1);
    expect(saveDays).toHaveBeenCalledTimes(1);
    expect(saveDays).toHaveBeenNthCalledWith(1, 1);

    const secondRequest = coordinator.enqueue(30);
    expect(secondRequest.normalizedDays).toBe(30);

    resolveFirst(1);
    await Promise.resolve();

    expect(saveDays).toHaveBeenCalledTimes(2);
    expect(saveDays).toHaveBeenNthCalledWith(2, 30);

    resolveSecond(30);
    await Promise.all([firstRequest.pending, secondRequest.pending]);
  });

  it('falls back to the default when normalizing invalid values', () => {
    expect(normalizeIncidentHistoryWindowDays('oops')).toBe(
      DEFAULT_INCIDENT_HISTORY_WINDOW_DAYS
    );
  });
});
