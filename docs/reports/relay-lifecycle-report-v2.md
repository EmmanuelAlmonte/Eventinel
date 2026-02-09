# Relay lifecycle report v2 (Updated)

Original: 2026-02-02
Updated: 2026-02-06

## 1) Executive summary (3 bullets)
- Startup and data flow are less over-gated than before: UI renders a StartupScreen instead of `null`, and relay connections run in the background so users are not blocked on network.
- Cache-first behavior is materially improved: incident subscriptions are no longer gated on `hasConnectedRelay`, so SQLite cache hydration can proceed even while relays are connecting or disconnected.
- Remaining risks are mostly robustness/observability: cache adapter init is not awaited (if async), relay "connected" semantics can be optimistic, and production log suppression reduces diagnosability.

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report
Also reviewed: current working tree changes (uncommitted) on top of these commits.

## 2) P0/P1/P2 table (paths + rationale)

| Priority | Risk | Impact | Evidence / rationale |
| --- | --- | --- | --- |
| P2 | Cache adapter initialization is not awaited (assumption-dependent) | Medium | `lib/ndk.ts` calls `cacheAdapter.initialize()` without `await`. If initialize is async, early cache queries can race table creation. This needs validation against upstream behavior. |
| P2 | Relay "connected" includes auth states (optimistic UI) | Low-Med | `lib/relay/status.ts` treats `AUTH_REQUESTED`/`AUTHENTICATING` as connected (`status >= CONNECTED`). `contexts/RelayStatusContext.tsx` uses this for stats. Subscriptions are no longer gated by this, but banners/stats can be optimistic. |
| P2 | Production log suppression reduces observability | Low-Med | `index.ts` replaces `console.log/info/debug` with no-ops when `__DEV__` is false. This is a performance win but removes production diagnostics unless replaced with telemetry. |
| P2 | Notification/detail flows do not directly query SQLite cache | Medium | `components/notifications/IncidentNotificationBridge.tsx` and `screens/IncidentDetailScreen.tsx` rely on in-memory incident cache and relay fetch; there is no explicit SQLite cache lookup. Mitigation: cache-first subscription can seed memory quickly, and detail has read-through relay fetch. |

## 3) What changed since the 2026-02-02 report set
- Startup UI: StartupScreen replaces blank UI during relay init (`App.tsx`).
- Relay connect gating: relay connection is started in the background; UI becomes ready without waiting (`App.tsx`).
- Storage robustness: relay loading has a timeout fallback to defaults (prevents indefinite startup gating) (`App.tsx`).
- Cache hydration gating: incident subscription enablement no longer depends on relay connectivity (`contexts/IncidentSubscriptionContext.tsx`).
- Relay settings: reconnect action added (`screens/RelayConnectScreen.tsx`). (commit 051d880)
- Production logging: verbose logs disabled (`index.ts`). (commit 051d880)
- Relay defaults centralized (single source of truth + env parsing) and `.env.example` updated. (commits e450048, 96b0436)
- NDK SQLite cache adapter patch added/updated to restore tag-based cache queries for replaceable events. (commits e450048, 6dc63f3)

## 4) Failure analysis (poor network)
- First failure now shifts from "blank screen" to "stale/offline data semantics": UI is available, and cache-first subscription can hydrate incidents, but relay banners and "Loading..." messaging must accurately convey stale vs live.
- If storage stalls: StartupScreen should time out and proceed with default relays; saved relays may merge in later.
- Notification/deep-link opens from a terminated app still depend on timing: if subscription has not seeded memory yet and relays are unavailable, read-through relay fetch fails and in-memory cache misses remain.

## 5) Profiling/diagnostics plan
1) Startup timeline instrumentation
- Method: log timings around `loadRelays()`, relay pool add, `ndk.connect()`, first cache hit from `useSubscribe`, and first relay connect event. Use `performance.now()` and keep logs in DEV.
- Expected: UI becomes ready immediately after storage read; cache hit should occur before relay EOSE; relay connect may lag.

2) Relay flapping and render churn
- Method: simulate unstable network and observe RelayStatusProvider update frequency and render counts in Map/Feed.
- Expected: relay banners update without causing noticeable frame drops; if not, batch/debounce status updates.
