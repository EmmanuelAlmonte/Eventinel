# Map Performance Review

Original: 2026-02-02
Updated: 2026-02-05
Scope: Map screen + Mapbox rendering + incident subscription pipeline.

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report

## Implemented Since Initial Report
- Marker architecture: moved from React MarkerView-per-incident to Mapbox ShapeSource + CircleLayer/SymbolLayer with clustering.
  - Evidence: `screens/MapScreen.tsx` uses `Mapbox.ShapeSource` with `cluster` enabled and renders cluster + point layers.
- Data-to-map decoupling: incidents converted to a minimal GeoJSON FeatureCollection (id + point geometry + {incidentId,severity}).
  - Evidence: `lib/map/types.ts` `incidentsToFeatureCollection()`; consumed via `useMemo` in `screens/MapScreen.tsx`.
- Offscreen work gating: subscription runs only when Map/Feed is focused and app is active; MapScreen also renders an empty feature set when unfocused.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx` gates `enabled` by focus + AppState; `screens/MapScreen.tsx` uses `useIsFocused()` and `visibleIncidents = isFocused ? incidents : []`.
- Cache correctness/perf: patched NDK SQLite adapter so tag-based cache queries work; removed `cacheUnconstrainFilter`; added client-side filtering + incremental event processing. (commits e450048, 6dc63f3)
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch`, `hooks/useIncidentSubscription.ts` (no `cacheUnconstrainFilter`, incremental merge), `__tests__/lib/ndkCacheAdapter.test.ts`.

## Findings (Prioritized)

### P1
1) Potential memory growth in `useSubscribe` `events` retention (NDK-internal)
- Files: `hooks/useIncidentSubscription.ts`
- Evidence: app code does not and cannot trim the `events` array returned by `useSubscribe`; `closeOnEose: false` keeps the subscription alive while focused.
- Impact: medium if `useSubscribe` retains an append-only list for the life of the subscription; low if it internally bounds/evicts.
- Weak assumption to validate: NDK stores every received event in a growing JS array for the entire subscription lifetime.

2) No viewport/bounds culling before building GeoJSON (future-scaling)
- Files: `screens/MapScreen.tsx`, `lib/map/types.ts`
- Evidence: incidents are gated by focus, but not filtered by visible camera bounds/zoom before `incidentsToFeatureCollection()`.
- Impact: low at current `INCIDENT_LIMITS.MAX_CACHE = 250`; becomes meaningful if the cap is raised.

### P2
1) Mapbox min/max zoom constants unused
- Files: `lib/map/constants.ts`, `screens/MapScreen.tsx`
- Evidence: `MAPBOX_CONFIG.MIN_ZOOM`/`MAX_ZOOM` are defined but never passed to Mapbox Camera/MapView.

2) User location uses `PointAnnotation` + React view instead of native puck
- Files: `screens/MapScreen.tsx`
- Evidence: user marker is `Mapbox.PointAnnotation` with a `View` child.

3) Gesture camera handler does JS work at high frequency
- Files: `screens/MapScreen.tsx`
- Evidence: `onCameraChanged` clears timers and toggles follow state during active gestures.

## Risks / Testing Notes
- Cluster interactions should be validated on-device. See `docs/reports/map-marker-manual-test-guide.md`.
- Ensure patch-package applies the NDK cache adapter patch in CI/release builds. Regression test: `__tests__/lib/ndkCacheAdapter.test.ts`.
- If incident limits or update frequency are increased, re-check GeoJSON build cost and ShapeSource update behavior under pan/zoom.
