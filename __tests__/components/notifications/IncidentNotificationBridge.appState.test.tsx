/**
 * IncidentNotificationBridge app-state transition tests.
 *
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react-native';

import {
  cleanupIncidentNotificationBridgeTest,
  createIncident,
  incidentNotificationBridgeElement,
  mockShowToastShow,
  renderIncidentNotificationBridge,
  setSharedIncidentsState,
  setupIncidentNotificationBridgeTest,
  triggerAppState,
} from './incidentNotificationBridgeTestHarness';

describe('IncidentNotificationBridge app-state behavior', () => {
  beforeEach(setupIncidentNotificationBridgeTest);
  afterEach(cleanupIncidentNotificationBridgeTest);

  it('keeps background-to-foreground resume silent for already visible incidents', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    triggerAppState('background');

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();

    triggerAppState('active');

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    await waitFor(() => {
      expect(mockShowToastShow).not.toHaveBeenCalled();
    });
  });

  it('does not arm a later toast storm when the history window changes while the app is inactive before first seed completes', () => {
    const { rerender } = renderIncidentNotificationBridge();
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
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();

    triggerAppState('active');

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });
});
