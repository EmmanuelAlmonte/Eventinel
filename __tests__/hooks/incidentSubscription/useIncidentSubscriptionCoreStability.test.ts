/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react-native';

const mockMarkHistoryRefreshSatisfiedCallbacks: Function[] = [];

jest.mock('../../../hooks/incidentSubscription/useIncidentSubscriptionPlanner', () => {
  const React = require('react');

  return {
    useIncidentSubscriptionPlan: () => ({
      desiredCells: React.useMemo(() => ['dr5reg'], []),
      locationKey: 'location-key',
      stableLocation: React.useMemo(() => [-75.1652, 39.9526], []),
      subscriptionFilterKey: 'filter-key',
      subscriptionPlan: React.useMemo(() => ({ truncated: false }), []),
    }),
  };
});

jest.mock('../../../hooks/incidentSubscription/useIncidentSubscriptionState', () => {
  const React = require('react');

  return {
    useIncidentSubscriptionState: () => {
      const [state, setState] = React.useState({
        incidents: [],
        severityCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        updatedIncidents: [],
        removedIncidentIds: [],
        totalEventsReceived: 0,
        hasReceivedHistory: false,
      });
      const registryRef = React.useRef(null);

      if (!registryRef.current) {
        registryRef.current = {
          subscriptions: new Map(),
          eoseBySubscriptionKey: new Map(),
          start: jest.fn(),
          stop: jest.fn(),
          stopAll: jest.fn(),
          setHasReceivedHistory: jest.fn(),
          clear: jest.fn(),
        };
      }

      return {
        state,
        setState,
        incidentMapRef: React.useRef(new Map()),
        lastUpdatedRef: React.useRef(null),
        lastTotalEventsRef: React.useRef(0),
        lastFilterKeyRef: React.useRef('disabled'),
        pendingEventsRef: React.useRef([]),
        flushTimerRef: React.useRef(null),
        flushTimerDelayMsRef: React.useRef(null),
        subscriptionRegistry: registryRef.current,
        lastRefreshMetaRef: React.useRef({
          filterKey: 'disabled',
          desiredCount: 0,
          truncated: false,
          sinceDays: 0,
        }),
        refreshEpochRef: React.useRef(0),
        activeHistoryRefreshRef: React.useRef(null),
        refreshWatchdogTimerRef: React.useRef(null),
      };
    },
  };
});

jest.mock('../../../hooks/incidentSubscription/useIncidentSubscriptionController', () => {
  const React = require('react');

  return {
    useIncidentSubscriptionController: jest.fn((args) => {
      mockMarkHistoryRefreshSatisfiedCallbacks.push(args.markHistoryRefreshSatisfied);

      const stableNoop = React.useCallback(() => undefined, []);
      const stableFalse = React.useCallback(() => false, []);
      const stableHasReceivedHistory = React.useCallback(() => true, []);

      return {
        hasReceivedHistory: stableHasReceivedHistory,
        recomputeVisibleState: stableNoop,
        flushQueuedEvents: stableNoop,
        startSubscription: stableNoop,
        stopSubscription: stableNoop,
        stopAllSubscriptions: stableNoop,
        pruneToDesiredGeohashes: stableFalse,
        clearQueuedEvents: stableNoop,
      };
    }),
  };
});

import { useIncidentSubscription } from '../../../hooks/incidentSubscription/useIncidentSubscriptionCore';

describe('useIncidentSubscription callback stability', () => {
  beforeEach(() => {
    mockMarkHistoryRefreshSatisfiedCallbacks.length = 0;
  });

  it('keeps markHistoryRefreshSatisfied stable across unrelated renders', () => {
    const { rerender } = renderHook(
      ({ unrelatedRenderToken }) => {
        void unrelatedRenderToken;
        return useIncidentSubscription({
          location: [-75.1652, 39.9526],
          sinceDays: 7,
        });
      },
      {
        initialProps: {
          unrelatedRenderToken: 1,
        },
      }
    );

    const callbackBeforeUnrelatedRender =
      mockMarkHistoryRefreshSatisfiedCallbacks[
        mockMarkHistoryRefreshSatisfiedCallbacks.length - 1
      ];

    rerender({ unrelatedRenderToken: 2 });

    expect(
      mockMarkHistoryRefreshSatisfiedCallbacks[
        mockMarkHistoryRefreshSatisfiedCallbacks.length - 1
      ]
    ).toBe(callbackBeforeUnrelatedRender);
  });
});
