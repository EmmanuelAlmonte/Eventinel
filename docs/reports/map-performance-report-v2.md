# Map Performance Review v2

Date: 2026-02-02
Scope: Map screen + Mapbox marker rendering + incident data flow.
Method: Code-path review only (no runtime profiling in this pass).

## 1) Executive summary
- The map rendering path is inherently expensive: every incident becomes a React MarkerView with a View/Text/Pressable, and there is no clustering or viewport/zoom culling. With MAX_CACHE = 250, worst-case render cost is high and scales linearly. (Evidence: screens/MapScreen.tsx, components/map/IncidentMarker.tsx, lib/map/constants.ts)
- The data pipeline recomputes and re-renders too much: useIncidentSubscription parses/dedups/sorts the full events array on every update, and MapScreen re-renders all markers on any incident change. (Evidence: hooks/useIncidentSubscription.ts, screens/MapScreen.tsx)
- Several smaller issues (min/max zoom unused, high-frequency onCameraChanged work, non-native user marker) add avoidable JS/UI overhead; they will not fix the core scalability issue but do contribute to jank under load.

## 2) P0/P1/P2 table

| Priority | Issue | Files | Impact | Rationale (evidence + assumptions) |
| --- | --- | --- | --- | --- |
| P0 | MarkerView per incident with no clustering | screens/MapScreen.tsx, components/map/IncidentMarker.tsx, lib/map/constants.ts | High | Evidence: MapScreen renders `incidents.map(...)` into `<IncidentMarker/>` inside `Mapbox.MapView`; `IncidentMarker` uses `Mapbox.MarkerView` with React `View/Text/Pressable`; `INCIDENT_LIMITS.MAX_CACHE = 250`. Assumption: MarkerView scales poorly with high counts because each marker is a React view; verify in profiling. |
| P0 | No viewport/zoom culling; all incidents render regardless of camera bounds | screens/MapScreen.tsx | High | Evidence: `handleCameraChanged` only toggles followUser state; there is no bounds/zoom computation and no filtering of `incidents` before render. Assumption: users can view large regions or low zoom where many incidents are offscreen, causing unnecessary render work. |
| P1 | Full recompute of incident list on every event update (parse/dedup/sort) | hooks/useIncidentSubscription.ts | Med-High | Evidence: `useMemo` iterates all `events`, parses, dedups, sorts the full map, then slices; dependency is `events`, so any new event triggers a full pass. Assumption: `useSubscribe` emits frequent updates (`bufferMs: 100`) and the events list grows over time; confirm with profiling/telemetry. |
| P1 | Map renders full incident objects without a stable, minimal marker list | screens/MapScreen.tsx, components/map/IncidentMarker.tsx, lib/map/types.ts | Medium | Evidence: MapScreen passes full `incident` objects to `IncidentMarker`; `IncidentMarker` re-derives coordinates and colors each render. There is no memoized, minimal marker data list (id + [lng,lat] + severity). Assumption: reducing object churn and prop diffs will lower re-render cost; verify with React Profiler. |
| P1 | Marker rerenders on every incident update (no memoization; inline handler) | screens/MapScreen.tsx, components/map/IncidentMarker.tsx | Med-High | Evidence: `IncidentMarker` is not `React.memo`, and `handleMarkerPress` is a new function each render; any `incidents` change re-renders all markers. Assumption: marker re-render cost is material at 100+ markers; verify in profiling. |
| P1 | Cache workaround can inflate marker count outside geohash/time window | hooks/useIncidentSubscription.ts | Medium | Evidence: `cacheUnconstrainFilter` removes `#g`, `#t`, `since`, `limit` for cache queries; cached events can bypass geohash/time constraints until relay EOSE arrives. Assumption: cache size is large enough to materially increase incidents; confirm by logging cache event counts. |
| P2 | MAPBOX_CONFIG min/max zoom values are defined but unused | lib/map/constants.ts, screens/MapScreen.tsx | Low-Med | Evidence: `MIN_ZOOM`/`MAX_ZOOM` exist but MapView/Camera in MapScreen only uses `DEFAULT_ZOOM` and does not set min/max. Assumption: extreme zoom levels increase tile density/render cost; impact depends on user behavior. |
| P2 | onCameraChanged does per-frame JS work during gestures | screens/MapScreen.tsx | Low-Med | Evidence: `onCameraChanged` fires during gestures, clears timers, toggles followUser state, and schedules auto-resume. Assumption: this competes with marker render work; confirm with JS profiler while panning. |
| P2 | User location rendered as PointAnnotation with React view | screens/MapScreen.tsx | Low | Evidence: `Mapbox.PointAnnotation` with a `View` is used for user dot; native puck is not used. Assumption: native puck is cheaper; confirm by swapping and measuring. |

## 3) New opportunities (not in v1 report)
- Viewport/zoom culling: filter incidents by visible bounds or zoom level before rendering to cut marker count at low zoom. (Evidence: MapScreen has no bounds/zoom filter.)
- Data-to-map decoupling: derive a minimal, stable marker list with `useMemo` (id, coordinate, severity) and pass stable props to reduce churn. (Evidence: MapScreen passes full incident objects directly.)
- Apply MIN_ZOOM/MAX_ZOOM: enforce zoom limits to avoid extreme zoom levels that increase tile/label density and render cost. (Evidence: constants exist but unused.)
- Avoid full recompute on every event update: incremental update of the incident map or a memoized diff to reduce parse/sort cost. (Evidence: useIncidentSubscription fully recomputes on each `events` change.)

## 4) Load-failure analysis (what fails first under load)
1) JS thread stalls during incident bursts: useIncidentSubscription re-parses/re-sorts the full events list, then MapScreen re-renders all markers; you will see panning/zooming jank and delayed taps. Evidence: `bufferMs: 100` updates + `incidents.map` render path. Assumption: incident events arrive in bursts and exceed 100 items.
2) UI thread/Mapbox render thread drops frames with high marker counts: many MarkerView instances (each a React view with shadow/elevation) increase layout/draw cost; map gestures stutter first. Evidence: MarkerView per incident; `INCIDENT_LIMITS.MAX_CACHE = 250`. Assumption: device is mid/low-tier Android or older iOS.
3) Memory/GC pressure if events list grows unbounded: `events` from `useSubscribe` is not capped before parsing; GC churn can cause intermittent freezes. Evidence: no trimming of `events`, only `incidents` slice; assumption: NDK retains all events for live subscription.

## 5) Profiling plan
1) React render profiling (JS): Use React DevTools Profiler on MapScreen while simulating 100–250 incidents. Metrics: MapScreen commit duration, number of renders per incident update, and JS FPS via RN Perf Monitor. Expected: commit duration and render count scale linearly with incident count; JS FPS dips below 50/30 during bursts. (Assumption: incident updates arrive at least every 100–500ms.)
2) UI/Mapbox rendering profiling (native): Use Android Studio profiler (Frames/CPU/GPU) or Xcode Instruments (Core Animation + Time Profiler) while panning/zooming at 150–250 markers. Metrics: UI frame time (>16ms on 60Hz), GPU overdraw, and input latency. Expected: frame times spike during gestures; input latency increases as marker count rises.
