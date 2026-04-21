/**
 * IncidentNotificationBridge Tests
 *
 * Focuses on silent-baseline toast eligibility and sequential queue behavior.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockShowToastShow = jest.fn();
const mockShowToastHide = jest.fn();
const mockUseSharedIncidents = jest.fn();
const mockUseIncidentCacheApi = jest.fn(() => ({
  upsertMany: jest.fn(),
  getIncident: jest.fn(),
}));

let appStateChangeListener: ((nextState: string) => void) | null = null;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

jest.mock('@components/ui', () => ({
  showToast: {
    show: (...args: unknown[]) => mockShowToastShow(...args),
    hide: (...args: unknown[]) => mockShowToastHide(...args),
    error: jest.fn(),
  },
}));

jest.mock('@contexts', () => ({
  useIncidentCacheApi: () => mockUseIncidentCacheApi(),
  useSharedIncidents: () => mockUseSharedIncidents(),
}));

jest.mock('@hooks/useIncidentSubscription', () => ({
  toProcessedIncident: jest.fn((incident) => incident),
}));

jest.mock('@lib/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('@lib/notifications/pushTokenStorage', () => ({
  saveExpoPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@lib/notifications/incidentNotifications', () => ({
  coerceIncidentNotificationPayload: jest.fn(() => null),
  fetchIncidentFromRelay: jest.fn().mockResolvedValue(null),
}));

jest.mock('@lib/notifications/pushRegistration', () => ({
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue(null),
}));

Object.defineProperty(globalThis, '__DEV__', {
  value: true,
  configurable: true,
  writable: true,
});

import IncidentNotificationBridge from '../../../components/notifications/IncidentNotificationBridge';

function createIncident(
  incidentId: string,
  overrides: Partial<{
    eventId: string;
    createdAtMs: number;
    severity: number;
    type: string;
    title: string;
    address: string;
  }> = {}
) {
  return {
    incidentId,
    eventId: overrides.eventId ?? `event-${incidentId}`,
    title: overrides.title ?? `Incident ${incidentId}`,
    createdAtMs: overrides.createdAtMs ?? 1_000,
    severity: overrides.severity ?? 3,
    type: overrides.type ?? 'fire',
    location: {
      address: overrides.address ?? `Address ${incidentId}`,
    },
  };
}

function buildSharedIncidentsState(
  overrides: Partial<{
    incidents: ReturnType<typeof createIncident>[];
    updatedIncidents: ReturnType<typeof createIncident>[];
    hasReceivedHistory: boolean;
    historyWindowDays: number;
  }> = {}
) {
  return {
    incidents: [createIncident('a')],
    updatedIncidents: [],
    hasReceivedHistory: true,
    historyWindowDays: 7,
    ...overrides,
  };
}

function setSharedIncidentsState(
  overrides: Parameters<typeof buildSharedIncidentsState>[0] = {}
) {
  mockUseSharedIncidents.mockReturnValue(buildSharedIncidentsState(overrides));
}

function getShownToast(index = 0) {
  return mockShowToastShow.mock.calls[index]?.[0] as
    | {
        text1?: string;
        text2?: string;
        onHide?: () => void;
      }
    | undefined;
}

function triggerAppState(nextState: string) {
  if (!appStateChangeListener) {
    throw new Error('AppState listener was not registered');
  }

  appStateChangeListener(nextState);
}

async function flushToastTurn() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function getToastLogCount(consoleInfoSpy: jest.SpyInstance, event: string) {
  return consoleInfoSpy.mock.calls.filter(([message]) =>
    String(message).includes(`[IncidentToasts] ${event}`)
  ).length;
}

describe('IncidentNotificationBridge', () => {
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateChangeListener = null;
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener: any) => {
      appStateChangeListener = listener;
      return {
        remove: jest.fn(),
      } as any;
    });

    setSharedIncidentsState();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('does not toast initial hydration backlog', () => {
    render(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('does not toast backlog when the history window changes before the first completed seed', () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const backlogIncident = createIncident('backlog', {
      eventId: 'event-backlog-v1',
      createdAtMs: 500,
    });

    setSharedIncidentsState({
      incidents: [],
      updatedIncidents: [],
      hasReceivedHistory: false,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('shows a toast for a new post-baseline incident from updatedIncidents', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), createIncident('b')],
      updatedIncidents: [createIncident('b')],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Incident b',
          text2: 'Address b',
        })
      );
    });
  });

  it('dedupes the same incident revision delivered twice in the same batch', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB, incidentB],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });
  });

  it('does not re-toast a newer non-material revision', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const baselineIncident = createIncident('a', {
      eventId: 'event-a-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [baselineIncident],
      updatedIncidents: [],
    });
    rerender(<IncidentNotificationBridge />);

    const newerRevision = createIncident('a', {
      eventId: 'event-a-v2',
      severity: 3,
      type: 'fire',
      title: 'Updated title only',
    });

    setSharedIncidentsState({
      incidents: [newerRevision],
      updatedIncidents: [newerRevision],
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('re-toasts a material severity change for the same incident revision stream', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const firstInsert = createIncident('b', {
      eventId: 'event-b-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), firstInsert],
      updatedIncidents: [firstInsert],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
    });

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    const severityUpdate = createIncident('b', {
      eventId: 'event-b-v2',
      severity: 4,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), severityUpdate],
      updatedIncidents: [severityUpdate],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(2);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });
  });

  it('does not queue a follow-up toast when the same incident updates while its toast is active', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentBv1 = createIncident('b', {
      eventId: 'event-b-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentBv1],
      updatedIncidents: [incidentBv1],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
    });

    const incidentBv2 = createIncident('b', {
      eventId: 'event-b-v2',
      severity: 4,
      type: 'fire',
      title: 'Incident b severity update',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentBv2],
      updatedIncidents: [incidentBv2],
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('replaces a queued incident toast with the latest revision before it is shown', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });
    const incidentCv1 = createIncident('c', {
      eventId: 'event-c-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentCv1],
      updatedIncidents: [incidentB, incidentCv1],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });

    const incidentCv2 = createIncident('c', {
      eventId: 'event-c-v2',
      severity: 4,
      type: 'fire',
      title: 'Incident c latest',
      address: 'Updated Address c',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentCv2],
      updatedIncidents: [incidentCv2],
    });
    rerender(<IncidentNotificationBridge />);

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(2);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          text1: 'Incident c latest',
          text2: 'Updated Address c',
        })
      );
    });
  });

  it('caps the queued backlog during a distinct-incident burst', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidents = ['b', 'c', 'd', 'e', 'f', 'g'].map((incidentId, index) =>
      createIncident(incidentId, {
        eventId: `event-${incidentId}-v1`,
        createdAtMs: 2_000 + index,
      })
    );

    setSharedIncidentsState({
      incidents: [createIncident('a'), ...incidents],
      updatedIncidents: incidents,
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });

    for (let index = 0; index < 4; index += 1) {
      getShownToast(index)?.onHide?.();
      await flushToastTurn();
    }

    expect(mockShowToastShow).toHaveBeenCalledTimes(5);
    expect(mockShowToastShow).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ text1: 'Incident d' })
    );
    expect(mockShowToastShow).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ text1: 'Incident e' })
    );
    expect(mockShowToastShow).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ text1: 'Incident f' })
    );
    expect(mockShowToastShow).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ text1: 'Incident g' })
    );
  });

  it('drops queued old-epoch backlog when a new baseline starts but lets the current toast finish', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1', createdAtMs: 2_000 });
    const incidentC = createIncident('c', { eventId: 'event-c-v1', createdAtMs: 3_000 });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [incidentB, incidentC],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('absorbs stale updatedIncidents when a silent baseline completes', () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('keeps refresh backlog silent but still toasts a genuinely new post-refresh incident after a seeded baseline', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const { rerender } = render(<IncidentNotificationBridge />);
    const preservedIncident = createIncident('a', {
      eventId: 'event-a-v1',
      createdAtMs: 1_000,
    });
    const refreshBackfill = createIncident('b', {
      eventId: 'event-b-v1',
      createdAtMs: 2_000,
    });
    const liveIncident = createIncident('c', {
      eventId: 'event-c-v1',
      createdAtMs: 11_000,
    });

    setSharedIncidentsState({
      incidents: [preservedIncident],
      updatedIncidents: [],
      hasReceivedHistory: true,
      historyWindowDays: 7,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [preservedIncident],
      updatedIncidents: [],
      hasReceivedHistory: false,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [preservedIncident, refreshBackfill],
      updatedIncidents: [refreshBackfill],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();

    setSharedIncidentsState({
      incidents: [preservedIncident, refreshBackfill, liveIncident],
      updatedIncidents: [liveIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Incident c',
          text2: 'Address c',
        })
      );
    });

    nowSpy.mockRestore();
  });

  it('keeps an older post-refresh insert silent when it predates the current baseline', () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const staleIncident = createIncident('stale', {
      eventId: 'event-stale-v1',
      createdAtMs: 1,
    });

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), staleIncident],
      updatedIncidents: [staleIncident],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('keeps a same revision silent after a baseline reset and reconnect replay', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
    });

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('keeps background-to-foreground resume silent for already visible incidents', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    triggerAppState('background');

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();

    triggerAppState('active');

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('does not arm a later toast storm when the history window changes while the app is inactive before first seed completes', () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const backlogIncident = createIncident('backlog', {
      eventId: 'event-backlog-v1',
      createdAtMs: 750,
    });

    triggerAppState('background');

    setSharedIncidentsState({
      incidents: [],
      updatedIncidents: [],
      hasReceivedHistory: false,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();

    triggerAppState('active');

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('starts the baseline only once across overlapping refresh-cycle triggers', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);
    const incidentB = createIncident('b', { eventId: 'event-b-v1', createdAtMs: 2_000 });
    const incidentC = createIncident('c', { eventId: 'event-c-v1', createdAtMs: 3_000 });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [incidentB, incidentC],
    });
    rerender(<IncidentNotificationBridge />);

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(<IncidentNotificationBridge />);

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(getToastLogCount(consoleInfoSpy, 'baseline started')).toBe(1);
    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

});
