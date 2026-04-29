/**
 * IncidentNotificationBridge toast queue and revision policy tests.
 *
 * @jest-environment jsdom
 */

import { waitFor } from '@testing-library/react-native';

import {
  cleanupIncidentNotificationBridgeTest,
  createIncident,
  flushToastTurn,
  getShownToast,
  incidentNotificationBridgeElement,
  mockShowToastShow,
  renderIncidentNotificationBridge,
  setSharedIncidentsState,
  setupIncidentNotificationBridgeTest,
} from './incidentNotificationBridgeTestHarness';

describe('IncidentNotificationBridge toast queue behavior', () => {
  beforeEach(setupIncidentNotificationBridgeTest);
  afterEach(cleanupIncidentNotificationBridgeTest);

  it('shows a toast for a new post-baseline incident from updatedIncidents', async () => {
    const { rerender } = renderIncidentNotificationBridge();

    setSharedIncidentsState({
      incidents: [createIncident('a'), createIncident('b')],
      updatedIncidents: [createIncident('b')],
    });
    rerender(incidentNotificationBridgeElement());

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
    const { rerender } = renderIncidentNotificationBridge();
    const incidentB = createIncident('b', { eventId: 'event-b-v1' });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentB],
      updatedIncidents: [incidentB, incidentB],
    });
    rerender(incidentNotificationBridgeElement());

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(1);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });
  });

  it('does not re-toast a newer non-material revision', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const baselineIncident = createIncident('a', {
      eventId: 'event-a-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [baselineIncident],
      updatedIncidents: [],
    });
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).not.toHaveBeenCalled();
  });

  it('re-toasts a material severity change for the same incident revision stream', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const firstInsert = createIncident('b', {
      eventId: 'event-b-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), firstInsert],
      updatedIncidents: [firstInsert],
    });
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

    await waitFor(() => {
      expect(mockShowToastShow).toHaveBeenCalledTimes(2);
      expect(mockShowToastShow).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ text1: 'Incident b' })
      );
    });
  });

  it('does not queue a follow-up toast when the same incident updates while its toast is active', async () => {
    const { rerender } = renderIncidentNotificationBridge();
    const incidentBv1 = createIncident('b', {
      eventId: 'event-b-v1',
      severity: 3,
      type: 'fire',
    });

    setSharedIncidentsState({
      incidents: [createIncident('a'), incidentBv1],
      updatedIncidents: [incidentBv1],
    });
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);

    getShownToast(0)?.onHide?.();
    await flushToastTurn();

    expect(mockShowToastShow).toHaveBeenCalledTimes(1);
  });

  it('replaces a queued incident toast with the latest revision before it is shown', async () => {
    const { rerender } = renderIncidentNotificationBridge();
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
    rerender(incidentNotificationBridgeElement());

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
    rerender(incidentNotificationBridgeElement());

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
    const { rerender } = renderIncidentNotificationBridge();
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
    rerender(incidentNotificationBridgeElement());

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
});
