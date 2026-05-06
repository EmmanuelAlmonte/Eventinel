import {
  pruneUnconfirmedIncidentsForSubscription,
  type RelayConfirmationMapRef,
} from '../../../hooks/incidentSubscription/cacheConfirmation';
import { buildProcessedIncident } from '../../fixtures/incident/buildIncident';
import type { ProcessedIncident } from '../../../hooks/incidentSubscription/types';

const mockDeleteIncidentEventsFromNdkCache = jest.fn();

jest.mock('@lib/ndk', () => ({
  deleteIncidentEventsFromNdkCache: (...args: unknown[]) =>
    mockDeleteIncidentEventsFromNdkCache(...args),
}));

function createRef<T>(current: T) {
  return { current };
}

describe('cache confirmation pruning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prunes cache-only incidents covered by grouped subscription keys', () => {
    const coveredIncident = buildProcessedIncident('covered-cache-only', {
      eventId: 'event-covered',
      location: {
        lat: 39.9526,
        lng: -75.1652,
        city: 'Philadelphia',
        state: 'PA',
        geohash: 'dr5reg9',
      },
    });
    const outsideIncident = buildProcessedIncident('outside-cache-only', {
      eventId: 'event-outside',
      location: {
        lat: 40.7128,
        lng: -74.006,
        city: 'New York',
        state: 'NY',
        geohash: 'dr5ru77',
      },
    });
    const incidentMapRef = createRef(
      new Map<string, ProcessedIncident>([
        [coveredIncident.incidentId, coveredIncident],
        [outsideIncident.incidentId, outsideIncident],
      ])
    );
    const relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef =
      createRef(new Map([['g:dr5reg,dr5ref', new Set<string>()]]));

    const removed = pruneUnconfirmedIncidentsForSubscription({
      incidentMapRef,
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      subscriptionKey: 'g:dr5reg,dr5ref',
    });

    expect(removed).toEqual(['covered-cache-only']);
    expect(incidentMapRef.current.has('covered-cache-only')).toBe(false);
    expect(incidentMapRef.current.has('outside-cache-only')).toBe(true);
    expect(mockDeleteIncidentEventsFromNdkCache).toHaveBeenCalledWith([
      expect.objectContaining({
        incidentId: 'covered-cache-only',
        eventId: 'event-covered',
      }),
    ]);
  });

  it('uses an explicit cell group key and predicate for bounded backfill pruning', () => {
    const inBackfillWindow = buildProcessedIncident('backfill-cache-only', {
      eventId: 'event-backfill',
      createdAt: 1_735_560_000,
      createdAtMs: 1_735_560_000_000,
      location: {
        lat: 39.9526,
        lng: -75.1652,
        city: 'Philadelphia',
        state: 'PA',
        geohash: 'dr5reg9',
      },
    });
    const liveWindowIncident = buildProcessedIncident('live-window-cache-only', {
      eventId: 'event-live-window',
      createdAt: 1_735_680_000,
      createdAtMs: 1_735_680_000_000,
      location: {
        lat: 39.9526,
        lng: -75.1652,
        city: 'Philadelphia',
        state: 'PA',
        geohash: 'dr5reg9',
      },
    });
    const incidentMapRef = createRef(
      new Map<string, ProcessedIncident>([
        [inBackfillWindow.incidentId, inBackfillWindow],
        [liveWindowIncident.incidentId, liveWindowIncident],
      ])
    );
    const relayConfirmedIncidentIdsBySubscriptionKeyRef: RelayConfirmationMapRef =
      createRef(new Map([['backfill:2:1d-2d:g:dr5reg,dr5ref', new Set<string>()]]));

    const removed = pruneUnconfirmedIncidentsForSubscription({
      incidentMapRef,
      relayConfirmedIncidentIdsBySubscriptionKeyRef,
      subscriptionKey: 'backfill:2:1d-2d:g:dr5reg,dr5ref',
      cellGroupKey: 'g:dr5reg,dr5ref',
      shouldPruneIncident: (incident) =>
        incident.createdAtMs >= 1_735_516_800_000 &&
        incident.createdAtMs < 1_735_603_200_000,
    });

    expect(removed).toEqual(['backfill-cache-only']);
    expect(incidentMapRef.current.has('backfill-cache-only')).toBe(false);
    expect(incidentMapRef.current.has('live-window-cache-only')).toBe(true);
  });
});
