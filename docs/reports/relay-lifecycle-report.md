# Relay lifecycle report

Original: 2026-02-02
Updated: 2026-02-06

## Scope
Review of app startup, NDK init, relay lifecycle, gating, empty states, connection health, and cache use.

Recent commits reviewed (git log -5):
- 051d880 relay reconnect
- 6dc63f3 Patch update
- 96b0436 chore: update env example relay defaults
- e450048 feat: improve incident fallback and relay config
- 9ce0778 docs: update map performance report
Also reviewed: current working tree changes (uncommitted) on top of these commits.

## Implemented Since Initial Report
- Startup no longer returns `null`: a StartupScreen renders while relays load.
  - Evidence: `App.tsx` renders `<StartupScreen />` when `isReady` is false.
- UI is no longer blocked on relay connections: `ndk.connect()` is kicked off in the background and `isReady` flips immediately after relays are added.
  - Evidence: `App.tsx` calls `ndk.connect()` without awaiting, then `setIsReady(true)`.
- Startup relay loading has a timeout fallback (prevents an indefinite StartupScreen if storage stalls).
  - Evidence: `App.tsx` sets a timeout and proceeds with `DEFAULT_RELAYS` if `loadRelays()` is slow.
- Cache-first hydration is no longer blocked by relay connectivity.
  - Evidence: `contexts/IncidentSubscriptionContext.tsx` no longer gates `enabled` by `hasConnectedRelay`; Map/Feed show relay status as a banner instead of hard-blocking.
- Relay settings UI now supports explicit reconnect. (commit 051d880)
  - Evidence: `screens/RelayConnectScreen.tsx` adds a reconnect action that calls `relay.connect()`.
- Production log volume reduced. (commit 051d880)
  - Evidence: `index.ts` no-ops `console.log/info/debug` when `__DEV__` is false.
- Relay defaults and normalization are centralized (env-driven + shared helpers). (commits e450048, 96b0436)
  - Evidence: `lib/relay/config.ts`, `lib/relay/storage.ts`, `.env.example`.
- NDK SQLite cache adapter patched to restore tag-based cache queries for replaceable incidents. (commits e450048, 6dc63f3)
  - Evidence: `patches/@nostr-dev-kit+mobile+0.9.3-beta.70.patch`, `__tests__/lib/ndkCacheAdapter.test.ts`.

## Findings

### P1
- None identified that are both code-validated and high-likelihood at current gating.

### P2
1) Cache adapter initialization is not awaited (assumption-dependent)
- Files: `lib/ndk.ts`
- Evidence: `cacheAdapter.initialize()` is called without `await`. If `initialize()` is async, early queries could race table creation.
- Weak assumption: `NDKCacheAdapterSqlite.initialize()` is async. Validate by checking upstream signature or by adding a one-time readiness check.

2) Relay "connected" definition includes auth states (may be optimistic)
- Files: `lib/relay/status.ts`, `contexts/RelayStatusContext.tsx`
- Evidence: `isConnected(status)` returns `status >= CONNECTED`, which includes `AUTH_REQUESTED` and `AUTHENTICATING`.
- Impact: low currently because incident subscriptions are no longer gated by relay connectivity, but UI stats/banners may be optimistic.

3) Production log suppression reduces observability
- Files: `index.ts`
- Evidence: `console.log/info/debug` are replaced with no-ops in production builds.
- Risk: diagnosing relay/cache issues in production becomes harder unless you have an alternative logger/telemetry pipeline.

4) Notification and detail flows still do not directly query SQLite cache
- Files: `components/notifications/IncidentNotificationBridge.tsx`, `screens/IncidentDetailScreen.tsx`, `lib/ndk.ts`
- Evidence: both flows consult in-memory incident cache and/or fetch from relays; there is no explicit SQLite cache lookup API used here.
- Current mitigation: cache-first incident subscription can seed in-memory cache quickly (even without relays), and detail screen now has a read-through relay fetch on cache miss.

## Risks / testing notes
- Cold start with no network: verify cached incidents show on Feed/Map and relay banners do not block UI.
- Slow/blocked AsyncStorage: verify StartupScreen is visible and timeout fallback proceeds with defaults.
- Production diagnostics: confirm warnings/errors are still surfaced and consider adding structured logging for relays.
