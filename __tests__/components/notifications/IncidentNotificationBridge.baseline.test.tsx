/**
 * IncidentNotificationBridge baseline suppression tests.
 *
 * @jest-environment jsdom
 */

import {
  cleanupIncidentNotificationBridgeTest,
  createIncident,
  incidentNotificationBridgeElement,
  mockShowToastShow,
  renderIncidentNotificationBridge,
  setSharedIncidentsState,
  setupIncidentNotificationBridgeTest,
} from './incidentNotificationBridgeTestHarness';

describe('IncidentNotificationBridge baseline suppression', () => {
  beforeEach(setupIncidentNotificationBridgeTest);
  afterEach(cleanupIncidentNotificationBridgeTest);

  it('does not toast initial hydration backlog', () => {
    renderIncidentNotificationBridge();

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('does not toast backlog when the history window changes before the first completed seed', () => {
    const { rerender } = renderIncidentNotificationBridge();
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
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), backlogIncident],
      updatedIncidents: [backlogIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('absorbs stale updatedIncidents when a silent baseline completes', () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('keeps an older post-refresh insert silent when it predates the current baseline', () => {
    const { rerender } = renderIncidentNotificationBridge();
    const staleIncident = createIncident('stale', {
      eventId: 'event-stale-v1',
      createdAtMs: 1,
    });

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a')],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), staleIncident],
      updatedIncidents: [staleIncident],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });
});
