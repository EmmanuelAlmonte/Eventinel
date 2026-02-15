# Incident Feed Performance Review v2 (Updated)

Original: 2026-02-02
Updated: 2026-02-06
Scope: Incident feed list + subscription + render flow (including shared consumers: Map + notifications + cache).

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report
Also reviewed: current working tree changes (uncommitted) on top of these commits.

## 1) Executive summary (3 bullets)
- The biggest CPU trap from v2 is addressed: cache hydration is no longer unconstrained (`cacheUnconstrainFilter` removed) and the subscription hook incrementally merges events instead of reprocessing the full list each update.
- Offscreen work is meaningfully reduced: subscription is focus/AppState gated and Map/Feed render empty lists when unfocused, so hidden screens do not rebuild heavy UI.
- Remaining perf risks are mostly about memory and downstream consumers: potential NDK `events` retention growth during long focused sessions, and notification bridge work that scales with incident count.

## 2) P0/P1/P2 table (file paths + rationale)

| Priority | Impact | Files | Evidence / rationale (validated against current code) | Quick fix | Longer-term refactor |
| --- | --- | --- | --- | --- | --- |
| P1 | Medium | `hooks/useIncidentSubscription.ts` | App code does not trim the `events` array returned by `useSubscribe`. The hook processes incrementally, so CPU is bounded, but memory depends on NDK internals while `closeOnEose: false` and subscription is enabled. | Confirm whether `events.length` grows unbounded in practice; if yes, tighten filters (`sinceDays`) and keep focus/AppState gating (already present). | Upstream change or wrapper to bound retained events; store only incidentId-deduped state in app code. |
| P2 | Low-Med | `components/notifications/IncidentNotificationBridge.tsx` | Bridge still scans the full `incidents` array each update to find new incidentIds (linear work). | Use `updatedIncidents` from `useIncidentSubscription` instead of scanning full list. | Diff-based event stream from a store (bridge subscribes to deltas). |
| P2 | Low | `screens/IncidentFeedScreen.tsx` | Refresh is wired but no-op (`onRefresh={() => {}}`). | Implement refresh action (retry subscription) or remove. | Add explicit retry/error state and subscription restart semantics. |

## 3) What changed vs the 2026-02-02 reports
- Cache tag query workaround replaced with a local NDK SQLite adapter patch; cache queries can stay constrained. (commits e450048, 6dc63f3)
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch`, `__tests__/lib/ndkCacheAdapter.test.ts`.
- Subscription pipeline now incrementally merges new events and applies client-side filtering. (commit e450048)
  - Evidence: `hooks/useIncidentSubscription.ts` uses `lastEventCountRef` and `incidentMapRef`, and filters by since/geohash/incident tags.
- Subscription now focus/AppState gated.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx` computes `enabled` from focus + app active; Map/Feed report focus via `setMapFocused`/`setFeedFocused`.
- Cache context fan-out removed: cache writes no longer re-render the provider subtree, and producers can mutate cache without subscribing.
  - Evidence: `contexts/IncidentCacheContext.tsx` external-store pattern + `useIncidentCacheApi`.
- Theme token identity stabilized: `useAppTheme()` memoizes the `colors` object to preserve memoization in list rows.
  - Evidence: `hooks/useAppTheme.ts`.

## 4) Load-failure analysis (what fails first now)
1) If NDK retains an append-only `events` array: memory growth and GC pauses become the first failure under long focused sessions.
2) Subscription updates under bursts: shared subscription context updates can cause rerenders across Map/Feed/notifications (mitigated by focus gating and native map rendering).
3) Secondary: notification bridge full-list scans add steady overhead but are unlikely to be the first point of collapse at current caps.

## 5) Profiling plan (2 steps + expected metrics)
1) Memory + GC over time (focused session)
- Method: keep Feed focused for 30-60 minutes while streaming events (or replay test data). Track `events.length` (temporary debug log) and JS heap size.
- Metrics: JS heap growth rate, GC pause frequency, `events.length` trend.
- Expected: heap should plateau if NDK bounds events; if not, heap and `events.length` rise together.

2) Render churn under event bursts
- Method: record React commits while injecting bursts of new events; compare with Feed unfocused.
- Metrics: commits per minute, average commit duration, row rerender counts, dropped frames.
- Expected: unfocused screens should show minimal work (empty list); focused list should handle bursts without >16ms sustained commits.
