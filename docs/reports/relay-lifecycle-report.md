# Relay lifecycle report (2026-02-02)

## Scope
Review of app startup, NDK init, relay lifecycle, gating, empty states, connection health, and cache use.

## Findings

### P0
- None found.

### P1

1) Blank screen blocks UI during relay init
- Files: `App.tsx:149-210`
- Rationale: App returns `null` until `loadRelays()` completes and `setIsReady(true)` runs. If AsyncStorage is slow, blocked, or throws, the user sees a blank screen (including login) with no recovery UI. This is a startup/perf and UX failure mode.
- Quick fix: Render a lightweight startup screen or set `isReady` immediately and run relay initialization in the background.
- Longer-term refactor: Introduce a startup state machine (NDK init, session restore, relay load/connect, location) with explicit loading/failed states and timeouts.

2) Cache-first subscription is disabled while relays are disconnected
- Files: `contexts/IncidentSubscriptionContext.tsx:49-64`, `hooks/useIncidentSubscription.ts:88-120`, `screens/MapScreen.tsx:179-207`, `screens/IncidentFeedScreen.tsx:144-168`
- Rationale: `enabled` is gated by `hasConnectedRelay`, so `useSubscribe` is not started while relays are connecting/disconnected. This prevents cached incidents from showing (despite `CACHE_FIRST`), and produces “connecting/disconnected” empty states even when SQLite cache has data. This undercuts cache use and slows perceived load.
- Quick fix: Gate subscriptions on location only (or allow `enabled` while connecting) so cache can hydrate immediately; keep relay status messaging as a non-blocking overlay.
- Longer-term refactor: Split “cache hydration” from “relay subscription” (e.g., a cache-only query or a two-phase subscription), and add a “last-updated” indicator for stale cache.

3) Location-denied path leaves feeds stuck in perpetual loading/empty ambiguity
- Files: `contexts/LocationContext.tsx:32-38`, `hooks/useUserLocation.ts:51-104`, `screens/IncidentFeedScreen.tsx:124-199`, `screens/MapScreen.tsx:205-213`
- Rationale: Location fallback is `none`, so if permission is denied or location never resolves, `location` stays null. Subscription never enables, `hasReceivedHistory` stays false, and Feed shows “Loading…” indefinitely; Map shows no incidents and no “no incidents” message (EOSE never arrives). This is an empty-state gap.
- Quick fix: Add a distinct “location required/denied” empty state and allow a manual “retry” or “use approximate location” flow.
- Longer-term refactor: Persist last known location and allow a user-selected region, so cache and relay queries can proceed even without live GPS.

### P2

1) SQLite cache adapter initialization is not awaited
- Files: `lib/ndk.ts:13-16`
- Rationale: `cacheAdapter.initialize()` is likely async (example code in repo shows `await`). Without awaiting readiness, subscriptions may run before tables exist, leading to missed cache hydration or initialization errors on cold start.
- Quick fix: Create an async bootstrap that awaits cache initialization before `ndk` is used and before subscriptions begin.
- Longer-term refactor: Centralize NDK startup in a single async initializer that also coordinates session restore and relay connect.

2) Auth/session restore can briefly show Login for an already-authenticated user
- Files: `App.tsx:149-224`
- Rationale: `useNDKCurrentUser()` gates the login UI, but session restoration via `useSessionMonitor()` is async and not tracked; `currentUser` is likely null on first render even when a session exists, causing a flicker or incorrect initial routing.
- Quick fix: Add an “auth restoring” flag from the session monitor and hold UI until restoration completes.
- Longer-term refactor: Fold auth restore into the startup state machine with explicit states and timeouts.

3) Notification/deep-link incident fetch ignores SQLite cache
- Files: `components/notifications/IncidentNotificationBridge.tsx:64-88`, `lib/notifications/incidentNotifications.ts:43-69`, `screens/IncidentDetailScreen.tsx:71-92`
- Rationale: Notification handling fetches from relays only (`ONLY_RELAY`) and then falls back to in-memory cache. On cold start or offline, incidents that exist in SQLite cache are still treated as “not found,” and IncidentDetail never queries persistent cache or relays itself.
- Quick fix: Use `CACHE_FIRST` for notification fetch or query SQLite cache on incident detail miss.
- Longer-term refactor: Add a persistent incident lookup layer (SQLite-backed) used by detail screens and notification flows.

4) Relay settings screen does not track auth/flapping states
- Files: `screens/RelayConnectScreen.tsx:74-92`, `contexts/RelayStatusContext.tsx:65-82`
- Rationale: RelayConnect only listens to connect/disconnect/connecting events, while RelayStatusContext includes auth/authed/flapping. The settings UI can show stale status during auth or flapping, reducing connection health visibility.
- Quick fix: Subscribe to the same relay events as RelayStatusContext (auth, authed, flapping) and update status accordingly.
- Longer-term refactor: Drive RelayConnect UI from RelayStatusContext to avoid duplicate status logic and ensure consistent health reporting.

## Risks / testing notes
- Cold start with no network: verify cached incidents still show (Map + Feed) and empty states are accurate.
- Permission denied for location: verify UI shows a clear “location required” state instead of infinite loading.
- Slow AsyncStorage: verify app no longer blanks during relay load; add a timeout/log for relay init.
- Session restore: verify no login flicker when a valid session exists.
- Notification open from terminated app: verify incident detail resolves via cache or relay; add tests around notification payload parsing and cache fallback.
