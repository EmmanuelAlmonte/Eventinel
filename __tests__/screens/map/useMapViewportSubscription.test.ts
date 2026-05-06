/**
 * @jest-environment jsdom
 */

import type { MutableRefObject } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { MAP_SUBSCRIPTION } from '../../../lib/map/constants';
import { useMapViewportSubscription } from '../../../screens/map/useMapViewportSubscription';

const mockEncodeGeohashFromLngLat = jest.fn();
const mockPlanIncidentCells = jest.fn();
const mockShouldReuseIncidentSubscriptionPlanForViewport = jest.fn();
const mockSummarizeVisibleCellCoverage = jest.fn();
const mockIsVisibleCellCoverageAcceptable = jest.fn();

jest.mock('../../../lib/map/geohashViewport', () => ({
  encodeGeohashFromLngLat: (...args: unknown[]) => mockEncodeGeohashFromLngLat(...args),
}));

jest.mock('../../../lib/map/subscriptionPlanner', () => ({
  isVisibleCellCoverageAcceptable: (...args: unknown[]) =>
    mockIsVisibleCellCoverageAcceptable(...args),
  planIncidentCells: (...args: unknown[]) => mockPlanIncidentCells(...args),
  shouldReuseIncidentSubscriptionPlanForViewport: (...args: unknown[]) =>
    mockShouldReuseIncidentSubscriptionPlanForViewport(...args),
  summarizeVisibleCellCoverage: (...args: unknown[]) =>
    mockSummarizeVisibleCellCoverage(...args),
}));

function createIdleState(center: [number, number], zoom = 14) {
  return {
    properties: {
      center,
      bounds: {
        ne: [center[0] + 0.01, center[1] + 0.01] as [number, number],
        sw: [center[0] - 0.01, center[1] - 0.01] as [number, number],
      },
      zoom,
    },
  };
}

describe('useMapViewportSubscription', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    mockSummarizeVisibleCellCoverage.mockReturnValue({
      visibleCellCount: 1,
      desiredCellCount: 1,
      missingVisibleCellCount: 0,
      coverageRatio: 1,
    });
    mockIsVisibleCellCoverageAcceptable.mockReturnValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  it('cancels a stale viewport debounce when active coverage can be reused', () => {
    const setMapFocused = jest.fn();
    const setMapSubscriptionAnchor = jest.fn();
    const setMapSubscriptionViewport = jest.fn();
    const lastCameraZoomRef = { current: 14 } as MutableRefObject<number>;

    mockEncodeGeohashFromLngLat
      .mockReturnValueOnce('initial-anchor')
      .mockReturnValueOnce('stale-anchor')
      .mockReturnValueOnce('reused-anchor');
    mockPlanIncidentCells
      .mockReturnValueOnce({
        desiredCells: ['initial-cell'],
        visibleCells: ['initial-cell'],
        key: 'initial-plan',
        truncated: false,
      })
      .mockReturnValueOnce({
        desiredCells: ['stale-cell'],
        visibleCells: ['stale-cell'],
        key: 'stale-plan',
        truncated: false,
      })
      .mockReturnValueOnce({
        desiredCells: ['initial-cell'],
        visibleCells: ['initial-cell'],
        key: 'reused-plan',
        truncated: false,
      });
    mockShouldReuseIncidentSubscriptionPlanForViewport
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const { result, unmount } = renderHook(() =>
      useMapViewportSubscription({
        isFocused: true,
        lastCameraZoomRef,
        setMapFocused,
        setMapSubscriptionAnchor,
        setMapSubscriptionViewport,
      })
    );

    act(() => {
      result.current.handleMapIdle(createIdleState([-75.1652, 39.9526]));
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_UPDATE_DEBOUNCE_MS);
    });

    expect(setMapSubscriptionViewport).toHaveBeenCalledTimes(1);
    expect(setMapSubscriptionViewport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [-75.1652, 39.9526],
      })
    );

    act(() => {
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_MIN_UPDATE_INTERVAL_MS + 1);
      result.current.handleMapIdle(createIdleState([-73.99, 40.75]));
      result.current.handleMapIdle(createIdleState([-75.164, 39.953]));
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_UPDATE_DEBOUNCE_MS);
    });

    expect(setMapSubscriptionViewport).toHaveBeenCalledTimes(1);
    expect(setMapSubscriptionAnchor).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('publishes a focused zoom-in viewport even when active coverage can be reused', () => {
    const setMapFocused = jest.fn();
    const setMapSubscriptionAnchor = jest.fn();
    const setMapSubscriptionViewport = jest.fn();
    const lastCameraZoomRef = { current: 14 } as MutableRefObject<number>;

    mockEncodeGeohashFromLngLat
      .mockReturnValueOnce('same-anchor')
      .mockReturnValueOnce('same-anchor');
    mockPlanIncidentCells
      .mockReturnValueOnce({
        desiredCells: ['covered-cell'],
        visibleCells: ['covered-cell'],
        key: 'plan-zoom-14',
        truncated: false,
      })
      .mockReturnValueOnce({
        desiredCells: ['covered-cell'],
        visibleCells: ['covered-cell'],
        key: 'plan-zoom-14-3',
        truncated: false,
      });
    mockShouldReuseIncidentSubscriptionPlanForViewport
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const { result, unmount } = renderHook(() =>
      useMapViewportSubscription({
        isFocused: true,
        lastCameraZoomRef,
        setMapFocused,
        setMapSubscriptionAnchor,
        setMapSubscriptionViewport,
      })
    );

    act(() => {
      result.current.handleMapIdle(createIdleState([-75.1652, 39.9526], 14));
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_UPDATE_DEBOUNCE_MS);
    });

    act(() => {
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_MIN_UPDATE_INTERVAL_MS + 1);
      result.current.handleMapIdle(createIdleState([-75.1652, 39.9526], 14.3));
      jest.advanceTimersByTime(MAP_SUBSCRIPTION.VIEWPORT_UPDATE_DEBOUNCE_MS);
    });

    expect(setMapSubscriptionViewport).toHaveBeenCalledTimes(2);
    expect(setMapSubscriptionViewport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [-75.1652, 39.9526],
        zoom: 14.3,
      })
    );
    expect(mockShouldReuseIncidentSubscriptionPlanForViewport).toHaveBeenCalledTimes(1);

    unmount();
  });
});
