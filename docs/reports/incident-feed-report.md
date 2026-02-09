# Incident Feed Performance Review

Original: 2026-02-02
Updated: 2026-02-06
Scope: Incident feed list rendering + subscription pipeline (shared incidents, cache usage, and notification bridge).

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report
Also reviewed: current working tree changes (uncommitted) on top of these commits.

## Implemented Since Initial Report
- Cache queries are constrained again (no `cacheUnconstrainFilter`): local NDK SQLite cache adapter patch restores tag-based cache queries for replaceable incidents. (commits e450048, 6dc63f3)
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch`, `__tests__/lib/ndkCacheAdapter.test.ts`.
- Subscription processing is incremental: only new events are parsed/merged; incidents map is capped to `maxIncidents`. (commit e450048)
  - Evidence: `hooks/useIncidentSubscription.ts` uses `lastEventCountRef` + `incidentMapRef` + incremental slice.
- Offscreen work gating: subscription is enabled only when Map or Feed is focused and app is active.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx` focus/AppState gating; `screens/IncidentFeedScreen.tsx` reports focus.
- Dependency update: FlashList bumped to `@shopify/flash-list@^1.8.3`. (commit 6dc63f3)
  - Evidence: `package.json`.
- Cache context render fan-out removed: cache writes no longer re-render the provider subtree, and producers can mutate cache without subscribing.
  - Evidence: `contexts/IncidentCacheContext.tsx` external-store pattern (`useSyncExternalStore`) + split hooks (`useIncidentCacheApi`, `useIncidentCacheVersion`).
- Theme colors object identity stabilized.
  - Evidence: `hooks/useAppTheme.ts` memoizes `colors`.

## Remaining Findings (Prioritized)

### P1 (High Impact)
1) Potential NDK `events` retention growth (memory) depends on `useSubscribe` internals
- Files: `hooks/useIncidentSubscription.ts`
- Evidence: app code does not trim the `events` array returned by `useSubscribe`.
- Weak assumption: NDK retains an append-only JS array for the subscription lifetime; confirm by profiling `events.length` over time.
- Quick fix (if confirmed): gate subscriptions more aggressively (already gated by focus/AppState) and consider shorter `sinceDays` or tighter filters.
- Longer-term refactor: upstream feature request or wrapper that bounds retained events.

### P2 (Medium/Low Impact)
1) Notification bridge scans full incident list on updates
- Files: `components/notifications/IncidentNotificationBridge.tsx`
- Evidence: after seeding, it `filter`s the full `incidents` array to find new incidentIds on every update.
- Quick fix: use `updatedIncidents` (already computed in `useIncidentSubscription`) instead of scanning the full list.

2) Refresh UI is wired but no-op
- Files: `screens/IncidentFeedScreen.tsx`
- Evidence: `refreshing={false}` and `onRefresh={() => {}}`.

## Risks & Testing Notes
- Cache patch correctness: ensure patch-package runs in CI/release; regression test exists.
- Notification flows: validate notification tap works when offline and before relays connect (now partially mitigated by cache-first subscription + read-through fetch in detail).
- Feed perf sanity: scroll 200-300 incidents on a mid-tier Android device while events stream in; watch for dropped frames.
