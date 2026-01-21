# Task Handoff: Shared Location & Cache Debugging

**Created**: 2026-01-21 ~14:00
**Status**: In Progress
**Complexity**: Medium
**Estimated Context**: ~40K tokens

---

## Session Summary

This session focused on two main areas: (1) implementing UI/UX components (Toast, ErrorBoundary) and (2) debugging why incidents take time to load on app restart instead of loading instantly from cache.

We discovered the **SQLite cache is NOT returning events** - logs show events coming from `RELAY (post-EOSE)` instead of `CACHE (pre-EOSE)`. The root cause is likely the cache adapter's hashtag filter query only processes ONE tag filter (`#g`) and breaks, ignoring `#t` and `kinds`.

We also discovered that **MapScreen and IncidentFeedScreen were using different locations** because each had its own independent `useUserLocation` hook instance. The user has since created a `LocationProvider` context (visible in system reminders showing `useSharedLocation` import in MapScreen).

Additional work completed: iOS back button fix for RelayConnectScreen modal, FlyTo button for MapScreen, Toast-only error handling in LoginScreen.

## Current State

### What's Working
- Toast notification system (`showToast.success/error/warning/info`)
- ErrorBoundary wrapping app (both auth states)
- FlyTo button on MapScreen
- iOS back button on Relay Settings modal
- LocationProvider context (user implemented)
- Cache debugging logs added

### What's Not Working
- **Cache NOT returning incident events** - all events come from relay
- Cache hashtag query limitation (only processes first `#` filter)
- Need to verify IncidentFeedScreen also uses `useSharedLocation`

### Files Modified This Session
- `App.tsx` - Added ToastProvider, ErrorBoundary, iOS back button for Relays modal
- `lib/ndk.ts` - Added cache debugging logs on startup
- `hooks/useIncidentSubscription.ts` - Added explicit `CACHE_FIRST`, debug logging
- `hooks/useUserLocation.ts` - User modified to set default immediately
- `screens/MapScreen.tsx` - Added FlyTo button, now uses `useSharedLocation`
- `screens/LoginScreen.tsx` - Switched to toast-only errors (removed inline error state)

### Files Created This Session
- `components/ui/Toast.tsx` - Theme-aware toast notification system
- `components/ui/ErrorBoundary.tsx` - Error boundary with fallback variants
- `UI-UX-TASKS.md` - Documentation for UI/UX feature tracking

---

## Context Loading Instructions

**Read these files in order before continuing:**

### Tier 1 (Essential - Read First):
1. `CLAUDE.md` - Project conventions and NDK mobile rules
2. `hooks/useIncidentSubscription.ts` - Current subscription with cache debug logs
3. `lib/ndk.ts` - NDK and cache adapter initialization
4. `ndk-docs/mobile/src/cache-adapter/sqlite/index.ts` - Cache query logic (lines 198-244)

### Tier 2 (If Needed):
5. `contexts/` - Check for LocationProvider implementation
6. `screens/IncidentFeedScreen.tsx` - Verify it uses `useSharedLocation`
7. `UI-UX-TASKS.md` - Remaining UI/UX work documented

### Tier 3 (Deep Context):
8. `ndk-docs/core/src/subscription/index.ts` - Default subscription options, cacheUsage enum
9. `screens/MapScreen.tsx` - Reference for shared location usage

---

## Remaining Work

### Must Complete
- [ ] Verify IncidentFeedScreen uses `useSharedLocation` (not independent hook)
- [ ] Fix SQLite cache query to handle multiple hashtag filters (`#g` AND `#t`)
- [ ] OR implement shared incident subscription at app level (alternative approach)
- [ ] Verify cache returns events on app restart (should see `CACHE (pre-EOSE)` in logs)

### Should Complete
- [ ] Add network status banner (documented in UI-UX-TASKS.md)
- [ ] Add haptic feedback (documented in UI-UX-TASKS.md)
- [ ] Wire up remaining toast integrations (documented in UI-UX-TASKS.md)

### Out of Scope (Don't Do)
- Don't refactor NDK core cache adapter (too risky)
- Don't change event kind from 30911
- Don't remove existing inline error handling in other screens (only LoginScreen was changed)

---

## Key Decisions Made

| Decision | Reasoning | Alternatives Considered |
|----------|-----------|------------------------|
| Toast-only errors in LoginScreen | Modern mobile pattern, less visual clutter | Keep both toast + inline (redundant) |
| Explicit `cacheUsage: CACHE_FIRST` | Ensure cache is queried before relays | Trust default (might not apply correctly) |
| LocationProvider context | Share location across screens (single source) | Each screen fetches independently (causes different geohashes) |
| FlyTo via state, not ref | Mapbox RN uses declarative `centerCoordinate` prop | Camera ref methods (not well documented) |

## Gotchas & Warnings

- **Import Order**: `react-native-get-random-values` MUST be first import in App.tsx
- **NDK Mobile Only**: Always import from `@nostr-dev-kit/mobile`, never from `@nostr-dev-kit/ndk` directly
- **Cache Query Limitation**: SQLite adapter only processes FIRST hashtag filter (line 209 has `break;`)
- **Login Second Param**: `login(signer, true)` - second param is boolean, NOT options object
- **Two Locations Bug**: If you see different geohashes in logs, check that both screens use same location source

## Debug Logs to Look For

On app startup, you should see:
```
💾 [Cache] SQLite cache stats on startup:
   → Total events: X
   → Incidents (kind:30911): Y
   → Profiles: Z
```

When subscription starts:
```
🔍 [IncidentSub] Subscription started, waiting for events...
📥 [IncidentSub] +N events (total: N) from CACHE (pre-EOSE) @ XXXms  ← WANT THIS
   ✅ Cache is working! Events loaded before relay EOSE
```

If cache NOT working:
```
📥 [IncidentSub] +N events (total: N) from RELAY (post-EOSE) @ XXXms  ← BAD
```

## Code Patterns to Follow

### Toast Usage
```typescript
import { showToast } from '@components/ui';

// Success
showToast.success('Note published!');

// Error with description
showToast.error('Failed to connect', 'Check your network');

// Warning for validation
showToast.warning('Missing Field', 'Please enter a value');
```

### Shared Location (if LocationProvider exists)
```typescript
import { useSharedLocation } from '@contexts';

function MyScreen() {
  const { location, isLoading } = useSharedLocation();
  // ...
}
```

### Cache-First Subscription
```typescript
import { useSubscribe, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/mobile';

const { events, eose } = useSubscribe(filter, {
  closeOnEose: false,
  cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
});
```

## Verification Checklist

When the remaining work is complete, verify:

- [ ] `npx tsc --noEmit` passes (ignore ndk-docs folder errors)
- [ ] App launches on Android without crash
- [ ] App launches on iOS without crash
- [ ] Close app, reopen - incidents appear from CACHE within 500ms
- [ ] Map and Feed show SAME incidents (same location/geohash)
- [ ] Toast appears on LoginScreen error
- [ ] FlyTo button works on MapScreen

---

## Quick Start for Next LLM

1. Read this entire document
2. Read `CLAUDE.md` for NDK mobile rules
3. Read `hooks/useIncidentSubscription.ts` to see current state
4. Check `contexts/` for LocationProvider implementation
5. Run app and check console logs for cache behavior
6. If cache still not working, investigate SQLite query in `ndk-docs/mobile/src/cache-adapter/sqlite/index.ts`

---

*Handoff created by Claude Code session on 2026-01-21*
*Continue work by loading this file and following Quick Start*
