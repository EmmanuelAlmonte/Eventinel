# Task Handoff: Location Context & NDK Cache Optimization

**Created**: 2026-01-21 12:10
**Status**: In Progress
**Complexity**: Medium
**Estimated Context**: ~40K tokens

---

## Session Summary

This session addressed two critical performance issues in the Eventinel mobile app:

1. **Location Race Condition**: MapScreen and IncidentFeedScreen were each creating independent `useUserLocation()` hooks, causing different screens to have different locations (real GPS vs fallback) depending on timing. This resulted in different geohashes being used for incident subscriptions, showing different incidents on different screens.

2. **NDK Cache Not Working**: The SQLite cache had 100 incidents stored but wasn't returning them on app restart. Investigation revealed a bug in ndk-mobile's cache adapter where `events.id` uses `tagAddress` format (e.g., `30911:pubkey:dtag`) for parameterized replaceable events but `event_tags.event_id` uses actual hex event IDs - breaking the JOIN query.

We implemented fixes for both issues, and also optimized the map loading time by setting the default location immediately before async permission checks.

## Current State

### What's Working
- LocationContext shares location state across all screens (no more race condition)
- NDK cache returns ~100 events in <1 second using `cacheUnconstrainFilter` workaround
- Both MapScreen and IncidentFeedScreen use same geohash
- Simplified debug logging no longer blocks app startup
- App reloads without getting stuck on loading screen

### What's Not Working
- Map still shows "Loading map..." briefly (1-2 seconds) - the default location is set but permission check still takes time
- User's actual GPS location may still take time to acquire (expected behavior)
- The ndk-mobile cache bug is only worked around, not fixed upstream

### Files Modified This Session
- `App.tsx` - Added LocationProvider wrapping IncidentCacheProvider
- `contexts/index.ts` - Export LocationProvider and useSharedLocation
- `hooks/useUserLocation.ts` - Set default location immediately before async operations, set isLoading(false) at each success point
- `hooks/useIncidentSubscription.ts` - Added cacheUnconstrainFilter workaround and debug logging
- `lib/ndk.ts` - Added note about ndk-mobile bug, simplified debug logging with setTimeout
- `screens/MapScreen.tsx` - Use useSharedLocation() instead of useUserLocation()
- `screens/IncidentFeedScreen.tsx` - Use useSharedLocation() instead of useUserLocation()

### Files Created This Session
- `contexts/LocationContext.tsx` - SharedLocation provider and hook
- `.claude/tasks/TASK-LocationContext.md` - Task planning document

---

## Context Loading Instructions

**Read these files in order before continuing:**

### Tier 1 (Essential - Read First):
1. `CLAUDE.md` - Project conventions, NDK mobile rules (critical import patterns)
2. `contexts/LocationContext.tsx` - The new shared location provider
3. `hooks/useUserLocation.ts` - Location hook with immediate default loading

### Tier 2 (If Needed):
4. `hooks/useIncidentSubscription.ts` - Cache workaround with cacheUnconstrainFilter
5. `lib/ndk.ts` - NDK initialization and cache adapter setup
6. `screens/MapScreen.tsx` - How location is consumed

### Tier 3 (Deep Context):
7. `ndk-docs/mobile/src/cache-adapter/sqlite/index.ts` - The buggy cache adapter code (lines 280-315)
8. `.claude/tasks/TASK-LocationContext.md` - Original task planning

---

## Remaining Work

### Must Complete
- [ ] Test on real device to verify GPS works properly (emulator has no GPS)
- [ ] Consider persisting location to AsyncStorage for instant startup
- [ ] Report ndk-mobile cache bug upstream (events.id vs event_tags.event_id mismatch)

### Should Complete
- [ ] Add loading indicator for incidents on map (isInitialLoading is available but unused)
- [ ] Remove or reduce verbose console logging for production
- [ ] Consider showing skeleton markers while incidents load

### Out of Scope (Don't Do)
- Don't modify ndk-mobile source code directly (use workarounds)
- Don't implement background location tracking (not needed for this app)
- Don't add location persistence without user privacy consideration

---

## Key Decisions Made

| Decision | Reasoning | Alternatives Considered |
|----------|-----------|------------------------|
| Use React Context for location | Follows existing IncidentCacheContext pattern, simpler than Zustand | Zustand store (overkill for simple state) |
| Use cacheUnconstrainFilter workaround | Can't fix ndk-mobile source, this bypasses the broken tag JOIN | Monkey-patching setEvent (doesn't work with buffered writes) |
| Set default location immediately | Eliminates 5-second wait for GPS timeout on emulator | Could have removed loading screen entirely |
| Keep useUserLocation hook | Still useful for single-screen cases, LocationContext wraps it | Could have merged into context |

## Gotchas & Warnings

- **ndk-mobile cache bug**: For parameterized replaceable events (kind 30911), `events.id` uses `tagAddress` format but `event_tags.event_id` uses actual event ID. This breaks tag-based cache queries. The workaround is `cacheUnconstrainFilter: ['#g', '#t', 'since', 'limit']` which queries cache by `kinds` only.

- **Import Order**: `react-native-get-random-values` MUST be first import in App.tsx - NDK requires this polyfill.

- **LocationProvider placement**: Must be inside ThemeProvider but outside IncidentCacheProvider (location is more fundamental).

- **isLoading timing**: The hook now sets `isLoading(false)` at multiple points (cached, default, fresh) rather than just in the `finally` block.

- **Emulator GPS**: Android emulator has no GPS by default. Must enable location mocking in Extended Controls or test on real device.

## Code Patterns to Follow

```typescript
// Location consumption pattern (use shared context, not direct hook)
import { useSharedLocation } from '@contexts';

function MyScreen() {
  // ✅ Correct - uses shared location from context
  const { location, isLoading } = useSharedLocation();

  // ❌ Wrong - creates independent location state
  // const { location } = useUserLocation({ ... });
}
```

```typescript
// Cache workaround pattern for replaceable events
const { events, eose } = useSubscribe(filter, {
  cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
  // Remove tag filters for cache queries - bypasses broken JOIN
  cacheUnconstrainFilter: ['#g', '#t', 'since', 'limit'],
});
```

```typescript
// Immediate default location pattern
const getLocation = useCallback(async () => {
  // Set default IMMEDIATELY before any async operations
  if (fallback === 'default' && defaultLocation && !location) {
    setLocation(defaultLocation);
    setIsLoading(false); // UI shows instantly
  }

  // Then do async permission/GPS fetch in background
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    // ... rest of location logic
  }
});
```

## Verification Checklist

When the remaining work is complete, verify:

- [x] `npx tsc --noEmit` passes (baseline errors in tests/ErrorBoundary are pre-existing)
- [x] App launches without crash
- [x] Map appears quickly (within 1-2 seconds)
- [x] Cache returns events on second screen load
- [x] Both MapScreen and IncidentFeedScreen show same location/geohash
- [ ] Test on real device with GPS enabled
- [ ] Verify GPS location updates the map when acquired

---

## Quick Start for Next LLM

1. Read this entire document
2. Read `CLAUDE.md` for NDK rules and project conventions
3. Read `contexts/LocationContext.tsx` to understand the shared location pattern
4. Check `hooks/useUserLocation.ts` for the immediate-default-location optimization
5. Review `hooks/useIncidentSubscription.ts` for the cache workaround
6. Test on real device if possible (emulator has GPS limitations)
7. Consider implementing location persistence to AsyncStorage for true instant startup

---

## Console Output Reference

**Working cache output looks like:**
```
💾 [Cache] SQLite cache stats:
   → Total events: 100
   → Incidents (kind:30911): 100
💾 [Cache] Returned 100 cached events
📥 [IncidentSub] +100 events from CACHE (pre-EOSE) @ 1019ms
   ✅ Cache is working! Events loaded before relay EOSE
```

**If you see events from RELAY (post-EOSE) only, the cache workaround isn't working.**

---

*Handoff created by Claude Code session*
*Continue work by loading this file and following Quick Start*
