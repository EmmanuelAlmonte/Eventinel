# Consolidated Findings (Deduplicated)

Date: 2026-02-02
Sources: map-performance-report.md, incident-feed-report.md, incident-feed-report-v2.md, relay-lifecycle-report.md, relay-lifecycle-report-v2.md

This document consolidates all findings across the reports and removes duplicates. Related items are merged into a single entry where appropriate.

## P0
1) Map markers use MarkerView per incident with no clustering
   - Risk: MarkerView is heavy for large counts; performance degrades as incident count grows.
   - Affected: Map rendering and interactions.

2) Subscription pipeline scales with total cached events (events array grows with uptime)
   - Risk: CPU/memory growth from full parse/dedup/sort on each update; can saturate JS thread over time.
   - Affected: Feed + Map + notifications.

## P1
1) Cache queries are unconstrained due to cacheUnconstrainFilter
   - Removes #g/#t/since/limit for cache lookups, so off-area/old incidents can appear and full cache is reprocessed.
   - Affected: Feed + Map + cache correctness.
   - Status (2026-02-03): Fixed locally by patching NDK SQLite cache adapter to align event_tags.event_id with events.id for replaceable events; cacheUnconstrainFilter removed.

2) Full-list recompute and rerender churn on each update
   - Incidents are rebuilt and re-sorted each update; identities change and list/markers rerender broadly.
   - Includes: map markers rerender on every incident list update (no memoization/identity stability).

3) Cache context fan-out on version changes
   - Cache updates bump a version value, re-rendering all consumers even when they only need lookups.

4) Offscreen work continues unnecessarily
   - Map markers and incident subscription processing can keep running when Map/Feed are not focused.

5) Startup UI gating blocks or misleads users
   - App renders null until relay load finishes (blank screen risk).
   - Cache-first data is blocked while relays are disconnected, preventing offline cache hydration.
   - Location denied/unresolved stalls incident pipeline (no EOSE; feeds show indefinite loading states).

## P2
1) Map camera-change handler does JS work on every gesture update
   - Clears timers and toggles follow state during active gestures; may add jank under load.

2) User location marker is a React view
   - PointAnnotation with a View marker adds React overhead vs native puck.

3) Theme object identity breaks memoization
   - Theme colors are re-created on each render, invalidating memoized rows.

4) Notification bridge scans the full incident list on each update
   - Linear work per update; duplicates dedup/scan logic.

5) Feed row rendering is heavier than necessary
   - Per-row relative time compute and RNE Card usage add overhead for long lists.

6) FlashList layout optimizations missing
   - No overrideItemLayout/getItemType for (mostly) fixed-height rows.

7) Subscription buffering may be too aggressive
   - bufferMs = 100 can flush state frequently under event bursts.

8) Cache adapter initialization not awaited (possible race)
   - If initialize is async, early subscriptions may run before tables are ready.

9) Login/session readiness race
   - Login can surface “NDK not initialized” or flicker before session restore completes.

10) Relay health status is optimistic or inconsistent
   - Auth-required states counted as connected; RelayConnect does not reflect auth/flapping events; relay status updates may churn UI on flapping networks.

11) Relay connection calls may be redundant
   - Multiple connect triggers (startup + relay changes + add) could amplify reconnect churn under bad networks.

12) Notification/deep-link lookup ignores SQLite cache
   - Relay-only fetch path means cached incidents may be treated as missing when offline.

## Post-report updates (2026-02-03)
Implemented:
1) Relay config single source of truth
   - Added `lib/relay/config.ts` with `DEFAULT_RELAYS`, `LOCAL_RELAYS`, env parsing, and normalization helpers.
   - Updated `lib/relay/storage.ts` to import/re-export relay defaults and use shared normalization.
   - Updated `lib/nostr/config.ts` to re-export relay config so existing imports keep working.

Potential multi-source-of-truth conflicts (not fixed yet):
1) Incident type display config is duplicated and inconsistent
   - Canonical `TYPE_CONFIG` in `lib/nostr/config.ts`, but separate mappings in
     `components/ui/StatusBadge.tsx` and `components/ui/IncidentCard.tsx`.
2) Severity colors are defined in two places with different models
   - Numeric `SEVERITY_COLORS` in `lib/nostr/config.ts` vs named `SEVERITY_COLORS` in
     `lib/brand/colors.ts` (used by `components/ui/StatusBadge.tsx` and `components/ui/IncidentCard.tsx`).
3) Relay list display logic is duplicated
   - `formatRelayList` + `MAX_RELAY_LABELS` in `screens/MapScreen.tsx`,
     `screens/IncidentFeedScreen.tsx`, `screens/IncidentDetailScreen.tsx`.
4) Relay URL normalization duplicated
   - Shared `normalizeRelayUrl` in `lib/relay/config.ts` and local `normalizeUrl` in
     `screens/RelayConnectScreen.tsx`.
