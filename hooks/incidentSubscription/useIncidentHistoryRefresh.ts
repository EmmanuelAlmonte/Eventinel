import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  HistoryRefreshProgress,
  IncidentSubscriptionDisplayState,
  QueuedEvent,
  SubscriptionLifecycle,
} from './types';
import { computeHasReceivedHistory } from './reconcile';

const DEBUG_HISTORY_WINDOW =
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_INCIDENT_HISTORY_WINDOW === '1' &&
  (globalThis as Record<string, unknown>).describe == null;

export const HISTORY_REFRESH_WATCHDOG_MS = 6000;

export type HistoryRefreshCompletionReason = 'complete' | 'watchdog';
export type HistoryRefreshSatisfactionSource = 'cache' | 'eose';

export function logHistoryWindowDebugEvent(
  event: string,
  details?: Record<string, unknown>
) {
  if (!DEBUG_HISTORY_WINDOW) {
    return;
  }

  if (details) {
    console.info(`[HistoryWindowDebug] ${event}`, details);
    return;
  }

  console.info(`[HistoryWindowDebug] ${event}`);
}

export function summarizeQueuedEventSources(
  queuedEvents: readonly Pick<QueuedEvent, 'source'>[]
) {
  return queuedEvents.reduce(
    (summary, queued) => {
      summary[queued.source] += 1;
      return summary;
    },
    { cache: 0, relay: 0 }
  );
}

interface UseIncidentHistoryRefreshArgs {
  activeHistoryRefreshRef: MutableRefObject<HistoryRefreshProgress | null>;
  refreshWatchdogTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  skippedHistoryRefreshKeysRef: MutableRefObject<Set<string>>;
  setState: Dispatch<SetStateAction<IncidentSubscriptionDisplayState>>;
  subscriptionRegistry: SubscriptionLifecycle;
}

export function useIncidentHistoryRefresh({
  activeHistoryRefreshRef,
  refreshWatchdogTimerRef,
  skippedHistoryRefreshKeysRef,
  setState,
  subscriptionRegistry,
}: UseIncidentHistoryRefreshArgs) {
  const clearHistoryRefreshWatchdog = useCallback(() => {
    if (refreshWatchdogTimerRef.current) {
      clearTimeout(refreshWatchdogTimerRef.current);
      refreshWatchdogTimerRef.current = null;
    }
  }, [refreshWatchdogTimerRef]);

  const completeHistoryRefresh = useCallback(
    (epoch: number, reason: HistoryRefreshCompletionReason) => {
      const activeHistoryRefresh = activeHistoryRefreshRef.current;
      if (!activeHistoryRefresh || activeHistoryRefresh.epoch !== epoch) {
        return;
      }

      const unsatisfiedKeys = Array.from(activeHistoryRefresh.expectedKeys).filter(
        (key) => !activeHistoryRefresh.satisfiedKeys.has(key)
      );
      const stillActiveUnsatisfiedKeys = unsatisfiedKeys.filter((key) =>
        subscriptionRegistry.subscriptions.has(key)
      );
      const removedUnsatisfiedKeys = unsatisfiedKeys.filter(
        (key) => !subscriptionRegistry.subscriptions.has(key)
      );

      for (const key of stillActiveUnsatisfiedKeys) {
        subscriptionRegistry.setHasReceivedHistory(key);
        skippedHistoryRefreshKeysRef.current.delete(key);
      }
      for (const key of removedUnsatisfiedKeys) {
        skippedHistoryRefreshKeysRef.current.add(key);
      }

      clearHistoryRefreshWatchdog();
      activeHistoryRefreshRef.current = null;

      logHistoryWindowDebugEvent('history-window refresh completed', {
        epoch,
        reason,
        expectedKeyCount: activeHistoryRefresh.expectedKeys.size,
        satisfiedKeyCount:
          activeHistoryRefresh.satisfiedKeys.size + stillActiveUnsatisfiedKeys.length,
        forcedUnsatisfiedKeys: stillActiveUnsatisfiedKeys,
        skippedRemovedKeys: removedUnsatisfiedKeys,
      });

      const nextHasReceivedHistory =
        removedUnsatisfiedKeys.length === 0
          ? true
          : computeHasReceivedHistory(
              true,
              subscriptionRegistry.subscriptions.keys(),
              subscriptionRegistry.eoseBySubscriptionKey,
              subscriptionRegistry.subscriptions.size
            );

      setState((prev) => {
        if (prev.hasReceivedHistory === nextHasReceivedHistory) {
          return prev;
        }

        return {
          ...prev,
          hasReceivedHistory: nextHasReceivedHistory,
        };
      });
    },
    [
      activeHistoryRefreshRef,
      clearHistoryRefreshWatchdog,
      setState,
      skippedHistoryRefreshKeysRef,
      subscriptionRegistry,
    ]
  );

  const markHistoryRefreshSatisfied = useCallback(
    (key: string, epoch: number, source: HistoryRefreshSatisfactionSource) => {
      const activeHistoryRefresh = activeHistoryRefreshRef.current;
      if (!activeHistoryRefresh || activeHistoryRefresh.epoch !== epoch) {
        logHistoryWindowDebugEvent('history-window satisfaction ignored', {
          key,
          epoch,
          source,
          activeEpoch: activeHistoryRefresh?.epoch ?? null,
        });
        return;
      }

      if (!activeHistoryRefresh.expectedKeys.has(key)) {
        logHistoryWindowDebugEvent('history-window satisfaction unexpected key', {
          key,
          epoch,
          source,
        });
        return;
      }

      if (activeHistoryRefresh.satisfiedKeys.has(key)) {
        return;
      }

      activeHistoryRefresh.satisfiedKeys.add(key);
      activeHistoryRefresh.sawDataSignal =
        activeHistoryRefresh.sawDataSignal || source === 'cache';
      subscriptionRegistry.setHasReceivedHistory(key);
      skippedHistoryRefreshKeysRef.current.delete(key);

      logHistoryWindowDebugEvent('history-window satisfaction recorded', {
        key,
        epoch,
        source,
        satisfiedKeyCount: activeHistoryRefresh.satisfiedKeys.size,
        expectedKeyCount: activeHistoryRefresh.expectedKeys.size,
      });

      if (
        activeHistoryRefresh.satisfiedKeys.size >= activeHistoryRefresh.expectedKeys.size
      ) {
        completeHistoryRefresh(epoch, 'complete');
        return;
      }

      setState((prev) =>
        prev.hasReceivedHistory
          ? {
              ...prev,
              hasReceivedHistory: false,
            }
          : prev
      );
    },
    [
      activeHistoryRefreshRef,
      completeHistoryRefresh,
      setState,
      skippedHistoryRefreshKeysRef,
      subscriptionRegistry,
    ]
  );

  return {
    clearHistoryRefreshWatchdog,
    completeHistoryRefresh,
    markHistoryRefreshSatisfied,
  };
}
