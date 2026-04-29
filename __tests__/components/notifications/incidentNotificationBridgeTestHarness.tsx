/**
 * Shared test harness for IncidentNotificationBridge behavior suites.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppState } from 'react-native';

export const mockShowToastShow = jest.fn();
export const mockShowToastHide = jest.fn();
export const mockUseSharedIncidents = jest.fn();
export const mockUseIncidentCacheApi = jest.fn(() => ({
  upsertMany: jest.fn(),
  getIncident: jest.fn(),
}));

let appStateChangeListener: ((nextState: string) => void) | null = null;
let consoleInfoSpy: jest.SpyInstance | null = null;

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

export function createIncident(
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

export function buildSharedIncidentsState(
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

export function setSharedIncidentsState(
  overrides: Parameters<typeof buildSharedIncidentsState>[0] = {}
) {
  mockUseSharedIncidents.mockReturnValue(buildSharedIncidentsState(overrides));
}

export function setupIncidentNotificationBridgeTest() {
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
}

export function cleanupIncidentNotificationBridgeTest() {
  consoleInfoSpy?.mockRestore();
  consoleInfoSpy = null;
  jest.restoreAllMocks();
}

export function renderIncidentNotificationBridge() {
  return render(incidentNotificationBridgeElement());
}

export function incidentNotificationBridgeElement() {
  return <IncidentNotificationBridge />;
}

export function getShownToast(index = 0) {
  return mockShowToastShow.mock.calls[index]?.[0] as
    | {
        text1?: string;
        text2?: string;
        onHide?: () => void;
      }
    | undefined;
}

export function triggerAppState(nextState: string) {
  if (!appStateChangeListener) {
    throw new Error('AppState listener was not registered');
  }

  appStateChangeListener(nextState);
}

export async function flushToastTurn() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function getToastLogCount(event: string) {
  if (!consoleInfoSpy) {
    throw new Error('Console info spy was not registered');
  }

  return consoleInfoSpy.mock.calls.filter(([message]) =>
    String(message).includes(`[IncidentToasts] ${event}`)
  ).length;
}
