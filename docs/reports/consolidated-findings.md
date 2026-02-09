# Consolidated Findings (Deduplicated)

Original: 2026-02-02
Updated: 2026-02-06
Sources: map-performance-report.md, map-performance-report-v2.md, incident-feed-report.md, incident-feed-report-v2.md, relay-lifecycle-report.md, relay-lifecycle-report-v2.md

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report
Also reviewed: current working tree changes (uncommitted) on top of these commits.

## Resolved / Implemented Since 2026-02-02
- Map marker rendering migrated to ShapeSource + native layers with clustering (removes MarkerView-per-incident bottleneck).
  - Evidence: `screens/MapScreen.tsx`, `lib/map/types.ts`.
- Subscription work is now focus/AppState gated and offscreen screens render empty lists.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx`, `screens/MapScreen.tsx`, `screens/IncidentFeedScreen.tsx`.
- Cache tag queries restored via local NDK SQLite adapter patch; `cacheUnconstrainFilter` removed.
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch`, `hooks/useIncidentSubscription.ts`, `__tests__/lib/ndkCacheAdapter.test.ts`.
- Subscription processing is incremental (no full reparse/dedup/sort per update).
  - Evidence: `hooks/useIncidentSubscription.ts` uses `incidentMapRef` + `lastEventCountRef`.
- Startup no longer renders `null`; relay connections are started in the background.
  - Evidence: `App.tsx` StartupScreen + non-blocking `ndk.connect()`.
- Startup relay load has a timeout fallback (prevents an indefinite StartupScreen if storage stalls).
  - Evidence: `App.tsx` timeout path uses `DEFAULT_RELAYS`.
- Relay defaults are centralized and env-driven.
  - Evidence: `lib/relay/config.ts`, `.env.example`. (commits e450048, 96b0436)
- Relay settings can explicitly reconnect; production log volume reduced.
  - Evidence: `screens/RelayConnectScreen.tsx`, `index.ts`. (commit 051d880)
- FlashList dependency updated (perf/bugfix surface area).
  - Evidence: `package.json`. (commit 6dc63f3)
- Cache context render fan-out removed (writes no longer re-render the provider subtree).
  - Evidence: `contexts/IncidentCacheContext.tsx` external-store pattern (`useSyncExternalStore`) + split hooks (`useIncidentCacheApi`, `useIncidentCacheVersion`).
- Theme token identity stabilized (memoized colors object).
  - Evidence: `hooks/useAppTheme.ts` `useMemo` around `colors`.

## P0
- None identified that are both code-validated and high-likelihood at current caps.

## P1
1) Potential NDK `useSubscribe` event retention growth (memory)
- Evidence: app code does not trim the `events` array returned by `useSubscribe` (`hooks/useIncidentSubscription.ts`).
- Weak assumption: NDK retains an append-only JS array for subscription lifetime; validate by profiling `events.length` over time.

2) No viewport/bounds/zoom culling before building GeoJSON (future scaling)
- Evidence: MapScreen builds a FeatureCollection for all focused incidents (`screens/MapScreen.tsx`, `lib/map/types.ts`) with no bounds filter.

## P2
1) Notification bridge does linear scans over incidents
- Evidence: `components/notifications/IncidentNotificationBridge.tsx` filters `incidents` to find new IDs on each update.

2) Map minor performance and scaling gaps
- Evidence: min/max zoom constants unused (`lib/map/constants.ts`), PointAnnotation user marker (`screens/MapScreen.tsx`), per-gesture JS work in `onCameraChanged` (`screens/MapScreen.tsx`).

3) Relay connectivity semantics and observability
- Evidence: auth states are treated as connected (`lib/relay/status.ts`), production logs are suppressed (`index.ts`).

## Notes
- `docs/reports/map-marker-manual-test-guide.md` exists for validating clustering behavior and tap interactions on-device.
