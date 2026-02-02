# Incident Feed Performance Review v2 (Hard-Nosed)

Date: 2026-02-02
Scope: Incident feed list + subscription + render flow (including shared consumers: Map + notifications + cache).

## 1) Executive summary (3 bullets)
- The subscription pipeline scales with *total cached events*, not just visible incidents; `useSubscribe` + unconstrained cache + full reparse/sort makes JS work proportional to cache size, which will jank the UI under load.
- The feed list uses FlashList but still re-renders more than necessary due to object identity churn and cross-screen consumers; Map and notifications amplify work even when the feed is the only visible tab.
- Under sustained load, the first failures are JS thread saturation (parse/sort + map marker re-renders) and memory growth from an unbounded `events` array, not network throughput.

## 2) P0/P1/P2 table (file paths + rationale)

| Priority | Impact | Files | Evidence / rationale (validated against code) | Quick fix | Longer-term refactor |
| --- | --- | --- | --- | --- | --- |
| P0 | High | `hooks/useIncidentSubscription.ts` | `useSubscribe` is called with `closeOnEose: false`; returned `events` array grows as new events arrive. There is *no* eviction/trim; `maxIncidents` is applied **after** parsing/dedup/sort. This means memory and CPU grow unbounded with uptime. | Bound processing early (e.g., cap events processed by created_at window or by incidentId map size before parse/sort). | Stream events into a bounded store (LRU by incidentId or time) instead of reprocessing the full `events` array. |
| P1 | High | `hooks/useIncidentSubscription.ts`, `lib/ndk.ts` | Cache query is explicitly unconstrained: `cacheUnconstrainFilter: ['#g', '#t', 'since', 'limit']`. This can return *all cached kind:30911* events, regardless of geohash/time, and they are parsed/sorted on each update. | Apply client-side filtering before parse/sort (reject events without matching `#g`/`#t`/`since`). | Fix NDK cache tag bug to allow constrained cache queries or build a local indexed incident cache. |
| P1 | High | `hooks/useIncidentSubscription.ts` | Every update rebuilds a `Map`, parses JSON for **all** events, sorts by `occurredAtMs`, slices, and recomputes counts. This is O(n log n) per update, even if only one event arrived. | Incremental update with a retained `Map` in a ref and stable object identities; only parse/merge new events. | External store with selector-based subscriptions to emit diffs to feed/map/notifications. |
| P1 | High | `screens/MapScreen.tsx`, `App.tsx` | MapScreen consumes `useSharedIncidents()` and renders `IncidentMarker` for **every** incident (`incidents.map(...)`). Tab Navigator does not set `detachInactiveScreens` or `unmountOnBlur`, so MapScreen likely stays mounted after first visit. **Assumption**: default bottom-tab behavior keeps inactive screens mounted. Result: map markers re-render on every feed update even when the map is not visible. | Gate incident rendering with `useIsFocused()` or `useFocusEffect()` and skip marker updates when not focused. | Move map markers into a separate store with diffed updates; use Mapbox `ShapeSource`/`SymbolLayer` to handle larger marker sets efficiently. |
| P1 | Med/High | `contexts/IncidentSubscriptionContext.tsx`, `App.tsx` | Subscription provider is mounted globally inside `MainNavigation` and is enabled purely by `location && hasConnectedRelay`. There is **no** AppState or tab-focus gating. This means the subscription continues processing even when user is on Profile or app is backgrounded. | Pause subscription when app is backgrounded or when neither Map nor Feed is focused. | Introduce a subscription manager that activates only for active feature surfaces (feed/map) with backpressure. |
| P1 | Medium | `contexts/IncidentCacheContext.tsx`, `contexts/IncidentSubscriptionContext.tsx` | Cache context value includes `version`, so any cache update re-renders all consumers. `IncidentSubscriptionProvider` calls `upsertMany(incidents)` with the full list on each update (O(n)). | Split cache API vs version subscription; avoid full-list upsert when only one incident changes. | Store incidents in a normalized external store with selectors; update cache incrementally. |
| P2 | Medium | `screens/IncidentFeedScreen.tsx` | FlashList has `estimatedItemSize` but no `overrideItemLayout` or `getItemType`. Rows are effectively fixed-height (`numberOfLines` for title/description), so FlashList still measures each row. **Assumption**: typography scale is consistent; dynamic type or long strings could break fixed height. | Provide `overrideItemLayout` with a fixed height or a small set of item types. | Create a dedicated lightweight row component with explicitly sized layout. |
| P2 | Medium | `hooks/useIncidentSubscription.ts` | `bufferMs: 100` on `useSubscribe` can cause frequent state flushes under event bursts, forcing repeated full recompute cycles. | Increase `bufferMs` (e.g., 250–500ms) or batch updates in a `useRef` before setState. | Implement a throttled event pipeline with backpressure and diffed updates. |
| P2 | Low/Med | `hooks/useAppTheme.ts`, `screens/IncidentFeedScreen.tsx` | `useAppTheme()` returns a new `colors` object every render, and `IncidentRow` receives `colors` as a prop. This defeats memoization and re-renders rows even when incident data is unchanged. | Memoize `colors` or pass only primitives needed by the row. | Stabilize theme tokens as static references or context selectors. |
| P2 | Low/Med | `components/notifications/IncidentNotificationBridge.tsx` | Notification bridge filters the full `incidents` list on every update after EOSE. This is linear work per update and duplicates dedup logic. | Track `lastUpdatedAt` or `totalEventsReceived` and short-circuit if unchanged. | Subscribe to incident diffs rather than full lists. |

## 3) New opportunities (not in v1 report)
- **Unbounded `events` array growth** (`hooks/useIncidentSubscription.ts`): no eviction or cap, `maxIncidents` only after processing. This is a direct memory/CPU growth vector.
- **Offscreen MapScreen updates** (`screens/MapScreen.tsx`, `App.tsx`): Map markers render for every incident and likely re-render while feed is active. Assumes default tab behavior keeps screens mounted.
- **Subscription not gated by focus/AppState** (`contexts/IncidentSubscriptionContext.tsx`): subscription continues even on Profile tab or when backgrounded, wasting CPU for screens not visible.
- **FlashList layout optimization missing** (`screens/IncidentFeedScreen.tsx`): rows are effectively fixed-height; `overrideItemLayout` could eliminate measurement overhead.
- **Aggressive `bufferMs`** (`hooks/useIncidentSubscription.ts`): 100ms buffering can flood re-renders during bursts.

## 4) Load‑failure analysis (what fails first)
1) **JS thread saturation on startup**: Unconstrained cache queries + full parse/sort cause the first visible jank. If cache contains hundreds/thousands of events, the `useMemo` parse/sort will block JS, delaying list render and causing scroll hitching.
2) **Memory growth leading to GC churn**: The `events` array grows indefinitely because `closeOnEose: false` and there is no trimming. GC pauses will increase, and eventually memory pressure can terminate the app.
3) **Mapbox marker overload**: If MapScreen remains mounted, every subscription update re-renders MarkerView components. Mapbox will stutter before the list does when incident counts climb.
4) **Secondary costs**: Notification bridge scans and cache fan-out add overhead but are not the first point of failure.

## 5) Profiling plan (2 steps + expected metrics)
1) **Hermes/Flipper JS CPU profile under synthetic load**
   - Method: Seed the cache with 500–1000 incident events; trigger subscription with `hasConnectedRelay` true.
   - Expected metrics: `useIncidentSubscription` consumes >40–60% of JS time; update cycles >30–50ms; JS FPS dips below 50 during initial load.

2) **UI thread + memory profiling during scroll + live updates**
   - Method: Use Android Studio Profiler (or Xcode Instruments) while scrolling the feed with 300+ incidents and while live events stream in.
   - Expected metrics: UI frame time >16ms (frame drops >5–10%); JS heap climbs steadily with uptime due to unbounded `events` array; MapScreen (if mounted) shows extra frame drops during updates.
