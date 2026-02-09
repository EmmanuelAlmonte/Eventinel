# Map Performance Review v2 (Updated)

Original: 2026-02-02
Updated: 2026-02-05
Scope: Map screen + Mapbox rendering + incident data flow.
Method: Code-path review (no runtime profiling in this pass).

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report

## 1) Executive summary (3 bullets)
- The prior failure mode (React MarkerView per incident) is gone: MapScreen now uses ShapeSource + native layers with clustering and a hard cap (`INCIDENT_LIMITS.MAX_CACHE = 250`), so map interactions should scale materially better at current limits.
- The subscription pipeline is now incremental and cache queries are constrained again: a local NDK SQLite cache adapter patch restores tag-based cache queries, `cacheUnconstrainFilter` is removed, and the hook applies client-side since/geohash/tag filtering.
- Remaining perf risks are second-order and mostly about scaling past current caps: potential NDK `events` retention growth, lack of viewport/bounds culling, and shared-context fan-out causing offscreen screen rerenders.

## 2) P0/P1/P2 table

| Priority | Issue | Files | Impact | Rationale (evidence + assumptions) |
| --- | --- | --- | --- | --- |
| P1 | Potential unbounded `events` retention from `useSubscribe` | `hooks/useIncidentSubscription.ts` | Medium | Evidence: `useSubscribe` is called with `closeOnEose: false` while enabled, and app code does not trim `events` (it only tracks `lastEventCountRef` and processes incrementally). CPU is bounded by incremental processing; memory depends on NDK internals. Assumption: NDK retains an append-only JS array of all events for the lifetime of the subscription. |
| P1 | No viewport/bounds/zoom culling before building GeoJSON | `screens/MapScreen.tsx`, `lib/map/types.ts` | Low-Med | Evidence: MapScreen gates by focus (`visibleIncidents`), then builds a FeatureCollection for all visible incidents via `incidentsToFeatureCollection()`. There is no bounds filter. At `MAX_CACHE = 250` this is typically acceptable; if caps increase, JS and native source updates scale linearly. |
| P2 | Shared context fan-out causes offscreen MapScreen rerenders | `contexts/IncidentSubscriptionContext.tsx`, `screens/MapScreen.tsx` | Low | Evidence: Incident updates change the context value, re-rendering all consumers (Map, Feed, notifications). Mitigation exists: MapScreen uses `visibleIncidents = isFocused ? incidents : []`, so GeoJSON rebuild is skipped when unfocused. |
| P2 | Mapbox min/max zoom constants unused | `lib/map/constants.ts`, `screens/MapScreen.tsx` | Low | Evidence: `MAPBOX_CONFIG.MIN_ZOOM` and `MAPBOX_CONFIG.MAX_ZOOM` are defined but not passed to Mapbox Camera/MapView. |
| P2 | User location rendered as PointAnnotation with a React view | `screens/MapScreen.tsx` | Low | Evidence: user marker uses `Mapbox.PointAnnotation` and a `View` child; native puck (`LocationPuck`/`UserLocation`) is not used. |
| P2 | Gesture camera handler does JS work at high frequency | `screens/MapScreen.tsx` | Low | Evidence: `onCameraChanged` runs during active gestures and clears timers / toggles follow state. This is lower risk now that marker rendering is native, but it still competes for JS time during pan/zoom. |

## 3) Implemented since the original reports (key deltas)
- ShapeSource + clustering marker rendering.
  - Evidence: `screens/MapScreen.tsx` uses `Mapbox.ShapeSource` with `cluster`, and renders `CircleLayer`/`SymbolLayer` for clusters and points.
- Minimal marker data flow via GeoJSON feature conversion.
  - Evidence: `lib/map/types.ts` `incidentsToFeatureCollection()`; MapScreen memoizes it.
- Offscreen work gating.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx` gates subscription by focus + AppState; Map/Feed report focus via `setMapFocused`/`setFeedFocused` and render empty lists when unfocused.
- Cache patch + incremental subscription processing. (commits e450048, 6dc63f3)
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch` (tag rows use `referenceId`), `hooks/useIncidentSubscription.ts` (client-side filters + incremental merge, no `cacheUnconstrainFilter`), `lib/ndk.ts` note, and `__tests__/lib/ndkCacheAdapter.test.ts`.

## 4) Load-failure analysis (what fails first under load)
1) If incident limits are raised above current caps: GeoJSON rebuild + ShapeSource updates become the first visible cost, especially if updates land during active gestures.
2) Long focused sessions with continuous live events: memory growth risk shifts to the NDK `events` array (if it is append-only). GC pauses are the first symptom.
3) Worst-case relay flapping plus incident updates: render frequency rises due to shared context updates. MapScreen mitigates heavy work when unfocused but still re-renders.

## 5) Profiling plan (2 steps + expected metrics)
1) JS profiling of incident bursts and map source updates
- Tooling: React DevTools Profiler + RN Perf Monitor (JS FPS).
- Method: simulate bursts of 50-200 new incident events while Map is focused; record commit durations and frequency.
- Metrics: MapScreen commit duration, time spent in `incidentsToFeatureCollection()`, commits per minute, JS FPS.
- Expected: at <=250 incidents, `incidentsToFeatureCollection()` should stay sub-millisecond to a few ms; any spikes should correlate with burst size.

2) Native frame-time profiling during pan/zoom with 250 incidents
- Tooling: Android Studio FrameTimeline/GPU profiler or Xcode Instruments (Core Animation + Time Profiler).
- Method: pan/zoom continuously while new events arrive; repeat with Map focused vs unfocused (Feed focused) to validate gating.
- Metrics: frame time percentiles (P50/P90/P99), input latency, map render thread spikes at ShapeSource updates.
- Expected: stable 60fps when idle; brief dips during source updates but no sustained hitching on mid-tier devices.
