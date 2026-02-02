# Relay lifecycle report v2 (2026-02-02)

## 1) Executive summary (3 bullets)
- Startup and data flow are over-gated: relays and location gating block cache hydration and result in blank or misleading empty states during the exact conditions where users most need fallback data.
- Connection health is optimistic and noisy: auth-required relays are treated as connected, and relay status updates can churn the entire UI on flapping networks.
- Initialization is not sequenced: NDK/session init, relay load/connect, and login UI run in parallel with no explicit readiness model, creating race conditions and inconsistent UX.

## 2) P0/P1/P2 table (paths + rationale)

| Priority | Risk | Impact | Evidence / rationale |
| --- | --- | --- | --- |
| P1 | Blank screen on startup until relays load | High | `App.tsx:179` loads relays async; UI returns `null` when `isReady` is false at `App.tsx:208`. No loading UI or timeout means a slow/blocked AsyncStorage read yields a blank app. |
| P1 | Cache-first subscription is disabled when relays are disconnected | High | `contexts/IncidentSubscriptionContext.tsx:52` gates `enabled` by `hasConnectedRelay` and location. Even though cache usage is `CACHE_FIRST` in `hooks/useIncidentSubscription.ts:117`, `useSubscribe` never runs while relays are connecting, so cached incidents cannot show. `screens/MapScreen.tsx:179` and `screens/IncidentFeedScreen.tsx:144` hard-block UI in that state. |
| P1 | Location denied or unresolved stalls the incident pipeline indefinitely | Medium | `contexts/LocationContext.tsx:36` uses `fallback: 'none'`. When permission is denied, `hooks/useUserLocation.ts:93` sets location to none. Because subscription needs location (`contexts/IncidentSubscriptionContext.tsx:53`), EOSE never arrives, leaving Feed stuck in “Loading...” and Map with no incident empty state. |
| P2 | Cache adapter initialization is not awaited | Medium | `lib/ndk.ts:15` calls `cacheAdapter.initialize()` without await. Assumption: initialize is async (NDK docs/examples typically await it). If true, early subscriptions can query before tables exist, producing missed cache hydration or errors. |
| P2 | Cache query ignores geohash/time filters, risking stale/wrong-region incidents | Medium | `hooks/useIncidentSubscription.ts:118` removes `#g`, `#t`, `since`, and `limit` from cache queries, while filters still include those constraints for relays at `hooks/useIncidentSubscription.ts:94`. This means cache results are unscoped and can surface old or wrong-location incidents when offline or before relay EOSE. |
| P2 | Relay “connected” state includes auth-required and authenticating relays | Medium | `lib/relay/status.ts:50` defines connected as status >= CONNECTED, which includes AUTH_REQUESTED/AUTHENTICATING; `contexts/RelayStatusContext.tsx:51` uses this for stats. Assumption: some relays block reads until auth completes. If so, `hasConnectedRelay` can be true while subscriptions still fail silently. |
| P2 | Relay status updates can thrash the UI under flapping conditions | Medium | `contexts/RelayStatusContext.tsx:39` recomputes and `setState` on every relay event; it is mounted high in the tree (`App.tsx:231`). With `flapping` events (`contexts/RelayStatusContext.tsx:74`) this can cause frequent re-renders across Map/Feed/Detail. |
| P2 | Login flows can surface “NDK not initialized” errors | Low/Med | Login UI can show immediately after `isReady` flips (`App.tsx:214`), but NDK init runs in an effect (`App.tsx:156`) with no readiness gating. `screens/LoginScreen.tsx:77` and `screens/LoginScreen.tsx:115` explicitly error if `ndk` is null. Assumption: `useNDKInit` is async or delays store readiness. |
| P2 | Redundant connect calls may cause connection storms | Low/Med | Connect is triggered on startup (`App.tsx:193`), again after relay list changes (`screens/RelayConnectScreen.tsx:133`), and per-relay on add (`screens/RelayConnectScreen.tsx:191`). Assumption: `ndk.connect()` is not fully idempotent under bad networks; if so, this amplifies reconnect churn. |

## 3) New opportunities (not in v1 report)
- Constrain cache hydration to a last-known region and time window rather than removing `#g`/`since` entirely; otherwise cache can show irrelevant incidents when offline. (`hooks/useIncidentSubscription.ts:118`)
- Treat AUTH_REQUESTED/AUTHENTICATING as not “connected” for gating or explicitly surface “auth pending” so the UI does not claim connectivity without data flow. (`lib/relay/status.ts:50`)
- Debounce or batch relay status updates to prevent app-wide re-render storms during relay flapping. (`contexts/RelayStatusContext.tsx:39`)
- Gate login actions on a concrete “NDK ready” signal so users do not hit “NDK not initialized.” (`App.tsx:156`, `screens/LoginScreen.tsx:77`)

## 4) Failure analysis (poor network)
- First failure: relay connect never reaches `hasConnectedRelay`, so Map/Feed hard-block into “Connecting/Disconnected” states and never run cache-first subscriptions (`contexts/IncidentSubscriptionContext.tsx:52`, `screens/MapScreen.tsx:179`). This removes the only offline fallback the app has.
- Second failure: notification/deep-link incident resolution depends on relay-only fetches; in a no-network start, `fetchIncidentFromRelay` fails and the detail screen shows “Incident not available” after its 2s timeout (path includes `lib/notifications/incidentNotifications.ts:48` and `screens/IncidentDetailScreen.tsx:84`).
- Third failure: relays that require auth may report “connected,” so subscriptions start but no events arrive, producing silent “loading” that never resolves (auth treated as connected in `lib/relay/status.ts:50`).

## 5) Profiling/diagnostics plan
1) Startup timeline instrumentation
   - Method: add timing logs around `initializeNDK`, `loadRelays`, `ndk.connect`, first relay:connect event, and first cached event emission (use existing `DEBUG_CACHE` logs). Use `performance.now()` or `console.time` in a local test build.
   - Expected findings: on poor network, `loadRelays` completes but `relay:connect` never fires, `hasConnectedRelay` remains false, and cache-first subscriptions never start. On cold start, `isReady` is set before a verified NDK/session ready signal.

2) Relay flapping + render churn assessment
   - Method: simulate flapping by toggling network or using an unstable relay; record render counts for Map/Feed with React DevTools or a lightweight render counter.
   - Expected findings: high-frequency relay events trigger `RelayStatusContext` updates and full subtree re-renders, causing JS frame drops and UI jitter, especially on the Map screen.
