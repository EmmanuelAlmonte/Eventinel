/**
 * IncidentNotificationBridge refresh and reconnect tests.
 *
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react-native';

import {
  cleanupIncidentNotificationBridgeTest,
  createIncident,
  flushToastTurn,
  getShownToast,
  getToastLogCount,
  incidentNotificationBridgeElement,
  mockShowToastShow,
  renderIncidentNotificationBridge,
  setSharedIncidentsState,
  setupIncidentNotificationBridgeTest,
} from './incidentNotificationBridgeTestHarness';

describe('IncidentNotificationBridge refresh and reconnect behavior', () => {
  beforeEach(setupIncidentNotificationBridgeTest);
  afterEach(cleanupIncidentNotificationBridgeTest);

  it('drops queued old-epoch backlog when a new baseline starts but lets the current toast finish', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1', createdAtMs: 2_000 });
    const incidentC = createIncident('c', { eventId: 'event-c-v1', createdAtMs: 3_000 });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [incidentB, incidentC],
    });
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('keeps refresh backlog silent but still toasts a genuinely new post-refresh incident after a seeded baseline', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const { rerender } = renderIncidentNotificationBridge();
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
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [preservedIncident],
      updatedIncidents: [],
      hasReceivedHistory: false,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [preservedIncident, refreshBackfill],
      updatedIncidents: [refreshBackfill],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();

    setSharedIncidentsState({
      incidents: [preservedIncident, refreshBackfill, liveIncident],
      updatedIncidents: [liveIncident],
      hasReceivedHistory: true,
      historyWindowDays: 30,
    });
    rerender(incidentNotificationBridgeElement());

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

  it('keeps a same revision silent after a baseline reset and reconnect replay', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
    });
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB],
      hasReceivedHistory: true,
    });
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('starts the baseline only once across overlapping refresh-cycle triggers', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1', createdAtMs: 2_000 });
    const incidentC = createIncident('c', { eventId: 'event-c-v1', createdAtMs: 3_000 });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [incidentB, incidentC],
    });
    rerender(incidentNotificationBridgeElement());

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(incidentNotificationBridgeElement());

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB, incidentC],
      updatedIncidents: [],
      hasReceivedHistory: false,
    });
    rerender(incidentNotificationBridgeElement());

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(getToastLogCount('baseline started')).toBe(1);
    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });
});
