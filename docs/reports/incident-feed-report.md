# Incident Feed Performance Review

Date: 2026-02-02
Scope: Incident feed list rendering + subscription pipeline (shared incidents, cache usage, and notification bridge).

## P0 Issues
- None identified in current review.

## P1 Issues (High Impact)
1) Cache query is unconstrained; expensive reprocessing on every update
   - Files: `hooks/useIncidentSubscription.ts`, `lib/ndk.ts`
   - Rationale: `cacheUnconstrainFilter` removes `#g`, `#t`, `since`, and `limit` for cache queries. This can return *all* cached kind:30911 events (potentially across all geohashes/time). The hook then re-parses, de-dups, sorts, and slices the full `events` array on each update. If the cache grows, CPU + memory spikes and UI jank are likely.
   - Quick fix: Add client-side filtering *before* parsing (or at least before sort) using tag scanning for `#g` and `#t`, and `created_at >= sinceTimestamp`. Also short-circuit parsing when `events.length` is unchanged.
   - Longer-term refactor: Fix upstream NDK cache tag bug to allow constrained cache queries or introduce a local SQLite index for incidents by geohash/time to avoid scanning unrelated cache entries.

2) Whole-list recompute creates new item identities; list + map re-render churn
   - Files: `hooks/useIncidentSubscription.ts`, `screens/IncidentFeedScreen.tsx`, `screens/MapScreen.tsx`
   - Rationale: Every subscription update rebuilds `ProcessedIncident` objects for *all* events, even when only one new event arrives. FlashList and Map markers receive new object identities, causing unnecessary re-render of all rows/markers.
   - Quick fix: Maintain a `Map<incidentId, ProcessedIncident>` in a `useRef` and update incrementally; only replace entries when the incoming event is newer. Then derive a sorted array from map values (or maintain a sorted list with minimal updates) to preserve stable object references where possible.
   - Longer-term refactor: Move subscription processing to a dedicated store (e.g., `useSyncExternalStore`, Zustand) that emits diffs and supports selector-based subscriptions (feed list, map markers, notifications) to minimize cross-screen churn.

3) Cache context re-render fan-out
   - Files: `contexts/IncidentCacheContext.tsx`, `contexts/IncidentSubscriptionContext.tsx`, `components/notifications/IncidentNotificationBridge.tsx`, `screens/IncidentDetailScreen.tsx`
   - Rationale: The cache context value includes `version`, so every cache update re-renders *all* consumers even when they only need `getIncident` or `upsertMany`. The subscription provider also calls `upsertMany(incidents)` with the full list on each update, causing repeated O(n) iteration.
   - Quick fix: Split cache context into a stable API context (`getIncident`, `upsertMany`) and a separate version/selector context. Only components that need updates should subscribe to the version.
   - Longer-term refactor: Replace the context with an external store + selectors, or add a selector-based hook to avoid full re-render fan-out on cache updates.

## P2 Issues (Medium/Low Impact)
1) Theme object identity invalidates memoized rows
   - Files: `hooks/useAppTheme.ts`, `screens/IncidentFeedScreen.tsx`
   - Rationale: `useAppTheme()` returns a new `colors` object each render. `IncidentRow` is memoized, but receives `colors`, so the row re-renders even if incident data is unchanged.
   - Quick fix: Memoize `colors` inside `useAppTheme` (e.g., `useMemo`) or pass only primitive color values needed for the row to reduce prop churn.
   - Longer-term refactor: Centralize theme tokens with stable references (or static theme objects) to avoid object recreation across renders.

2) Notification bridge scans full incident list each update
   - Files: `components/notifications/IncidentNotificationBridge.tsx`
   - Rationale: On every `incidents` change (after EOSE), it filters the entire list to detect new incidents. With larger lists or frequent updates, this adds avoidable work.
   - Quick fix: Track `lastUpdatedAt` or `totalEventsReceived` from `useIncidentSubscription` and only scan when these values change; or keep a ref to last processed length / timestamp.
   - Longer-term refactor: Emit per-incident diff events from the subscription store so the notification bridge processes only new items.

3) Row-level compute + UI heavy components
   - Files: `screens/IncidentFeedScreen.tsx`, `lib/utils/time.ts`
   - Rationale: Each row recomputes relative time and uses RNE `Card`, which is heavier than a lightweight `View` hierarchy. On older devices, this can add frame drops for long lists.
   - Quick fix: Cache formatted time in `ProcessedIncident` (e.g., `relativeTimeLabel`) or compute it in a lightweight `useMemo` at the row level. Consider replacing `Card` with a simpler container if performance is tight.
   - Longer-term refactor: Introduce a dedicated feed row component with minimal view depth and memoized styles.

## Risks & Testing Notes
- Changing cache filters or subscription processing can affect correctness (wrong geohash/time window) and incident ordering. Validate with a seeded cache containing off-area incidents and verify feed/map consistency.
- Any refactor to incremental updates or external store should be tested for:
  - Correct deduping by `incidentId` with newer `createdAt` taking precedence.
  - Stable rendering under rapid event bursts (simulate 100+ events).
  - Notification bridge behavior (no duplicate toasts; no missed incidents).
- Performance sanity checks:
  - Scroll the feed list with 200–500 incidents; watch for dropped frames.
  - Monitor CPU during live relay updates and after cache warm start.
  - Ensure Map markers still render correctly with larger incident sets.
