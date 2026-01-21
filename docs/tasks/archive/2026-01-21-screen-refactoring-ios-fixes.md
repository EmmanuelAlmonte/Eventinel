# Task Handoff: Screen Refactoring & iOS Map Fixes

**Created**: 2026-01-21 16:00
**Status**: In Progress
**Complexity**: Medium
**Estimated Context**: ~45K tokens

---

## Session Summary

This session completed a multi-phase refactoring of Eventinel Mobile, extracting shared logic from screens into reusable hooks and components. The work reduced total screen code by ~56% (1026→453 lines across MapScreen and IncidentFeedScreen).

Key accomplishments:
1. **Phase 1-3**: Extracted `useUserLocation`, `useIncidentSubscription` hooks; created `SeverityBadge`, `IncidentHeader` components; centralized `SEVERITY_COLORS` and `TYPE_CONFIG` in config
2. **Phase 4**: Refactored MapScreen and IncidentFeedScreen to use extracted modules
3. **iOS Fix**: Implemented `onLayout`-based fix for Mapbox 64x64 fallback issue in IncidentDetailScreen

Additional work done between sessions (by user):
- Created `IncidentCacheContext` for shared incident cache with LRU eviction
- Created `LocationContext` for shared location state
- Added `ErrorBoundary` and `Toast` components
- Fixed navigation serialization warnings (now passes `incidentId` only)
- Fixed PointAnnotation subview error (using emoji glyphs)
- Added path aliases (`@hooks`, `@contexts`, `@components`, `@lib`)

## Current State

### What's Working
- MapScreen uses `useIncidentSubscription` and shared location
- IncidentFeedScreen uses same hooks with shared location
- IncidentDetailScreen looks up incidents from cache
- Navigation passes `incidentId` only (no serialization warnings)
- iOS mini-map delays render until layout (fixes 64x64 fallback)
- Path aliases resolve correctly
- TypeScript compiles (only 2 pre-existing test errors)

### What's Not Working / Remaining
- Task #4: Missing "Key" screen - crashes when navigating from MenuScreen
- Task #5: iOS back button missing on Relay settings screen
- Task #6: "Relay not in pool" warning appears
- Task #7: Relay icon is 🌐 (should be 📡)

### Files Modified This Session
- `screens/IncidentDetailScreen.tsx` - Added `mapReady` state and `onLayout` handler for iOS fix
- `screens/MapScreen.tsx` - Refactored to use hooks (607→166 lines)
- `screens/IncidentFeedScreen.tsx` - Refactored to use hooks, now uses shared location
- `lib/nostr/config.ts` - Added `SEVERITY_COLORS` and `TYPE_CONFIG`
- `lib/utils/time.ts` - Created with `formatRelativeTime` functions
- `hooks/useUserLocation.ts` - Created location hook
- `hooks/useIncidentSubscription.ts` - Created subscription hook
- `hooks/index.ts` - Re-exports (now includes `useAppTheme`)
- `components/incident/SeverityBadge.tsx` - Created severity indicator
- `components/incident/IncidentHeader.tsx` - Created header component
- `do/task-handoffs/06_CONTINUE_TASKS.md` - Updated handoff document
- `LLM-HANDOFF.md` - Updated root handoff

### Files Created This Session
- `lib/utils/time.ts` - Time formatting utilities
- `lib/utils/index.ts` - Utils re-exports
- `hooks/useUserLocation.ts` - Location permission + tracking hook
- `hooks/useIncidentSubscription.ts` - NDK subscription hook
- `hooks/index.ts` - Hooks re-exports
- `components/incident/SeverityBadge.tsx` - Severity badge component
- `components/incident/IncidentHeader.tsx` - Incident header component
- `components/incident/index.ts` - Component re-exports

---

## Context Loading Instructions

**Read these files in order before continuing:**

### Tier 1 (Essential - Read First):
1. `CLAUDE.md` - Project conventions, NDK rules (CRITICAL)
2. `TASKS.md` - Full task list with remaining items
3. `do/task-handoffs/06_CONTINUE_TASKS.md` - Detailed handoff with patterns

### Tier 2 (Current Implementation):
4. `contexts/IncidentCacheContext.tsx` - Shared cache pattern
5. `contexts/LocationContext.tsx` - Shared location state
6. `screens/MapScreen.tsx` - Refactored example
7. `screens/IncidentFeedScreen.tsx` - Refactored example

### Tier 3 (Hooks & Utils):
8. `hooks/useIncidentSubscription.ts` - Subscription logic
9. `hooks/useUserLocation.ts` - Location logic
10. `lib/nostr/config.ts` - `SEVERITY_COLORS`, `TYPE_CONFIG` (end of file)

---

## Remaining Work

### Must Complete (Critical)
- [ ] Task #4: Fix missing "Key" screen navigation crash (`screens/MenuScreen.tsx:54-61`)

### Should Complete (High Priority)
- [ ] Task #5: Fix iOS back button on Relay settings screen
- [ ] Task #6: Investigate "Relay not in pool" warning
- [ ] Task #7: Change relay icon from 🌐 to 📡 (`App.tsx`)

### Nice to Have (Medium Priority)
- [ ] Task #8: Polish MapScreen with RNE components for overlays
- [ ] Task #9: Incident Creation Form (kind:30911 publishing)
- [ ] Task #10: Profile Editing (kind:0 metadata)

### Out of Scope (Don't Do)
- Don't refactor IncidentDetailScreen further (794 lines is acceptable for now)
- Don't add new authentication methods
- Don't change the cache eviction strategy

---

## Key Decisions Made

| Decision | Reasoning | Alternatives Considered |
|----------|-----------|------------------------|
| Hooks at root `/hooks/` not `lib/` | Golden rule: no React imports in `lib/` | Could have created `lib/hooks/` but violates pattern |
| `incidentId`-only navigation | Fixes serialization warnings, cleaner API | Passing full object (caused warnings) |
| `onLayout` for iOS map fix | Standard RN pattern, no external deps | Explicit dimensions (less flexible) |
| LRU cache (500 max) | Prevents memory bloat on long sessions | No limit (memory issues), smaller limit (cache misses) |
| Path aliases | Cleaner imports, matches project convention | Relative paths (messier) |

## Gotchas & Warnings

- **Import Order in App.tsx**: `react-native-get-random-values` MUST be first import
- **NDK Package**: Use `@nostr-dev-kit/mobile` NOT `@nostr-dev-kit/ndk-mobile`
- **React Keys**: Use `incidentId` (stable) NOT `eventId` (changes on updates)
- **Severity Counts**: Must be computed AFTER slicing, not before
- **PointAnnotation Children**: Only ONE child allowed (use emoji glyph, not RNE Icon)
- **Path Aliases**: Use `@hooks`, `@contexts`, `@lib`, `@components` - configured in tsconfig + babel

## Code Patterns to Follow

### Hook Usage (Location + Subscription)
```typescript
import { useIncidentSubscription, useAppTheme } from '@hooks';
import { useSharedLocation, useIncidentCache } from '@contexts';

export default function MyScreen() {
  const { location } = useSharedLocation();
  const { upsertMany } = useIncidentCache();
  const { incidents, hasReceivedHistory } = useIncidentSubscription({
    location,
    enabled: !!location,
  });

  // Cache incidents for DetailScreen lookup
  useEffect(() => {
    if (incidents.length > 0) upsertMany(incidents);
  }, [incidents, upsertMany]);
}
```

### Navigation (Serialization-Safe)
```typescript
// ✅ CORRECT
navigation.navigate('IncidentDetail', { incidentId: incident.incidentId });

// ❌ WRONG (causes serialization warning)
navigation.navigate('IncidentDetail', { incident });
```

### iOS Map Layout Fix
```typescript
const [mapReady, setMapReady] = useState(false);

<View
  style={styles.mapContainer}
  onLayout={(e) => {
    if (e.nativeEvent.layout.width > 0 && !mapReady) {
      setMapReady(true);
    }
  }}
>
  {mapReady ? <Mapbox.MapView ... /> : <Placeholder />}
</View>
```

## Verification Checklist

When the remaining work is complete, verify:

- [ ] `npx tsc --noEmit` passes (≤2 errors, test file only)
- [ ] App launches without crash (`npm start`)
- [ ] MapScreen shows markers correctly
- [ ] FeedScreen shows incident list
- [ ] Tap incident → Detail screen loads (no crash, no warnings)
- [ ] iOS mini-map renders at full size (not 64x64)
- [ ] No serialization warnings in console
- [ ] MenuScreen → "Private Key" doesn't crash (after fix)

---

## Quick Start for Next LLM

1. Read this entire document
2. Read `CLAUDE.md` for NDK rules and project conventions
3. Read `TASKS.md` for remaining tasks (#4-#10)
4. Pick Task #4 (Key screen fix) - it's 5 minutes
5. Run `npx tsc --noEmit` after changes
6. Test on device/emulator

---

## Architecture Summary

```
contexts/                         # React contexts
├── IncidentCacheContext.tsx      # Shared cache (LRU, 500 max)
├── LocationContext.tsx           # Shared location state
└── index.ts

hooks/                            # React hooks
├── useUserLocation.ts            # Location permission + tracking
├── useIncidentSubscription.ts    # NDK subscription + dedup
├── useAppTheme.ts                # Theme hook
└── index.ts

components/                       # UI components
├── incident/
│   ├── SeverityBadge.tsx
│   ├── IncidentHeader.tsx
│   └── index.ts
├── ui/
│   ├── ScreenContainer.tsx
│   ├── ErrorBoundary.tsx
│   ├── Toast.tsx
│   └── index.ts
└── map/
    └── IncidentMarker.tsx

lib/                              # Pure utilities (NO React)
├── utils/time.ts                 # formatRelativeTime functions
├── nostr/config.ts               # + SEVERITY_COLORS, TYPE_CONFIG
├── map/constants.ts              # INCIDENT_LIMITS, USER_LOCATION
└── map/types.ts                  # DEFAULT_CAMERA, MAP_STYLES

Path Aliases:
@hooks      → ./hooks
@contexts   → ./contexts
@components → ./components
@lib        → ./lib
```

---

*Handoff created by Claude Code session*
*Continue work by loading this file and following Quick Start*
