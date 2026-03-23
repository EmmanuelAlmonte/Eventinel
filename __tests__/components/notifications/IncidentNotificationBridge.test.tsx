/**
 * IncidentNotificationBridge Tests
 *
 * Focuses on live-toast behavior across history-window refreshes.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockShowToastShow = jest.fn();
const mockUseSharedIncidents = jest.fn();
const mockUseIncidentCacheApi = jest.fn(() => ({
  upsertMany: jest.fn(),
  getIncident: jest.fn(),
}));

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

import IncidentNotificationBridge from '../../../components/notifications/IncidentNotificationBridge';

function createIncident(incidentId: string) {
  return {
    incidentId,
    eventId: `event-${incidentId}`,
    title: `Incident ${incidentId}`,
    location: {
      address: `Address ${incidentId}`,
    },
  };
}

describe('IncidentNotificationBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as any);
    mockUseSharedIncidents.mockReturnValue({
      incidents: [createIncident('a')],
      hasReceivedHistory: true,
      historyWindowDays: 7,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a toast for a new live incident when the history window is unchanged', async () => {
    const { rerender } = render(<IncidentNotificationBridge />);

    mockUseSharedIncidents.mockReturnValue({
      incidents: [createIncident('a'), createIncident('b')],
      hasReceivedHistory: true,
      historyWindowDays: 7,
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

  it('does not toast historical backfill after a history-window change', () => {
    const { rerender } = render(<IncidentNotificationBridge />);

    mockUseSharedIncidents.mockReturnValue({
      incidents: [],
      hasReceivedHistory: false,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    mockUseSharedIncidents.mockReturnValue({
      incidents: [createIncident('a'), createIncident('older')],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(<IncidentNotificationBridge />);

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });
});
