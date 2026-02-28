# Task Implementation Guide

## Task Context

**Current Task**: `Implement Shared Incident Subscription Provider` (ID: `INCIDENT-SUB-001`)
**Category**: Refactor | **Tags**: race-condition, context, subscription, ndk, location

### Description

Create a shared subscription provider to eliminate duplicate NDK subscriptions between MapScreen and IncidentFeedScreen. Currently, both screens independently subscribe to incidents, causing race conditions where one screen shows data while the other shows empty. Additionally, disable the default location fallback to ensure subscriptions only start with real GPS coordinates.

### Dependencies

- **Requires**: None
- **Enables**: Reliable incident display across all screens

---

## Feature Context & File Mapping

### Feature Path

**App/Package**: `Eventinel`
**Feature Area**: `contexts`, `hooks`, `screens`
**Route/Endpoint**: N/A

### Core Files to Modify

```
Files to CREATE:
└── contexts/IncidentSubscriptionContext.tsx   # New shared subscription provider

Files to MODIFY:
├── contexts/LocationContext.tsx               # Change fallback: 'default' → 'none'
├── contexts/index.ts                          # Export new provider/hook
├── screens/MapScreen.tsx                      # Use useSharedIncidents(), remove subscription logic
├── screens/IncidentFeedScreen.tsx             # Use useSharedIncidents(), remove subscription logic
└── App.tsx                                    # Add IncidentSubscriptionProvider to hierarchy
```

### Key Dependencies

- **Internal**: `@hooks/useIncidentSubscription`, `@contexts/LocationContext`, `@contexts/IncidentCacheContext`
- **External**: `@nostr-dev-kit/mobile` (useSubscribe, NDKSubscriptionCacheUsage)

---

## Implementation Plan

### Root Cause Analysis

**Issue**: Two independent `useIncidentSubscription` hooks create separate NDK subscriptions. When location updates from default → GPS, subscriptions can receive different events depending on timing.
**Impact**: MapScreen shows 0 incidents while IncidentFeedScreen shows 99 (or vice versa)
**Solution Approach**: Single subscription at provider level, consumed by both screens via context

### Implementation Steps

1. **Create IncidentSubscriptionContext** - `contexts/IncidentSubscriptionContext.tsx`
2. **Disable default location fallback** - `contexts/LocationContext.tsx`
3. **Update context exports** - `contexts/index.ts`
4. **Simplify MapScreen** - `screens/MapScreen.tsx`
5. **Simplify IncidentFeedScreen** - `screens/IncidentFeedScreen.tsx`
6. **Update provider hierarchy** - `App.tsx`

### Key Code Changes

#### 1. New Context: IncidentSubscriptionContext.tsx

**File**: `contexts/IncidentSubscriptionContext.tsx`

```typescript
import React, { createContext, useContext, useEffect } from 'react';
import { useIncidentSubscription, ProcessedIncident } from '@hooks';
import { useSharedLocation } from './LocationContext';
import { useIncidentCache } from './IncidentCacheContext';
import type { Severity } from '@lib/nostr/config';

interface IncidentSubscriptionContextValue {
  incidents: ProcessedIncident[];
  isInitialLoading: boolean;
  hasReceivedHistory: boolean;
  severityCounts: Record<Severity, number>;
}

const IncidentSubscriptionContext = createContext<IncidentSubscriptionContextValue | null>(null);

export function IncidentSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { location } = useSharedLocation();
  const { upsertMany } = useIncidentCache();

  const {
    incidents,
    isInitialLoading,
    hasReceivedHistory,
    severityCounts,
  } = useIncidentSubscription({
    location,
    enabled: !!location,
  });

  // Cache incidents centrally for Detail screen lookups
  useEffect(() => {
    if (incidents.length > 0) {
      upsertMany(incidents);
    }
  }, [incidents, upsertMany]);

  return (
    <IncidentSubscriptionContext.Provider value={{
      incidents,
      isInitialLoading,
      hasReceivedHistory,
      severityCounts,
    }}>
      {children}
    </IncidentSubscriptionContext.Provider>
  );
}

export function useSharedIncidents(): IncidentSubscriptionContextValue {
  const context = useContext(IncidentSubscriptionContext);
  if (!context) {
    throw new Error('useSharedIncidents must be used within IncidentSubscriptionProvider');
  }
  return context;
}
```

#### 2. Disable Default Location

**File**: `contexts/LocationContext.tsx`

```typescript
// BEFORE (line 35-38):
const locationState = useUserLocation({
  fallback: 'default',
  defaultLocation: DEFAULT_CAMERA.centerCoordinate,
});

// AFTER:
const locationState = useUserLocation({
  fallback: 'none',
});
```

#### 3. Update Provider Hierarchy

**File**: `App.tsx`

```typescript
// BEFORE:
<LocationProvider>
  <IncidentCacheProvider>
    <MainNavigation />
  </IncidentCacheProvider>
</LocationProvider>

// AFTER:
<LocationProvider>
  <IncidentCacheProvider>
    <IncidentSubscriptionProvider>
      <MainNavigation />
    </IncidentSubscriptionProvider>
  </IncidentCacheProvider>
</LocationProvider>
```

#### 4. Simplify Screens

**File**: `screens/MapScreen.tsx` and `screens/IncidentFeedScreen.tsx`

```typescript
// REMOVE these lines from both screens:
import { useIncidentSubscription } from '@hooks';
const { upsertMany } = useIncidentCache();
const { incidents, ... } = useIncidentSubscription({ location, enabled: !!location });
useEffect(() => { upsertMany(incidents); }, [incidents, upsertMany]);

// ADD to both screens:
import { useSharedIncidents } from '@contexts';
const { incidents, isInitialLoading, hasReceivedHistory } = useSharedIncidents();
```

---

## Testing & Validation

### Test Scenarios

- Fresh app install (empty cache) - both screens should show loading, then same incidents
- Location permission denied - both screens show appropriate empty state
- GPS takes 4+ seconds - loading skeleton shown until GPS resolves
- Switch between tabs - incident counts match on both screens

### Success Criteria

- [ ] MapScreen and IncidentFeedScreen show identical incident counts
- [ ] No "default" location source appears in debug overlay (only "fresh" or "cached")
- [ ] Loading skeleton shows until real GPS location obtained
- [ ] Cache receives incidents (Detail screen can look up any incident)
- [ ] No TypeScript errors
- [ ] Console shows single subscription log set (not duplicate)

---

## Quick Commands

```bash
# Development
npm start                           # Start Expo dev server
npm run android                     # Run on Android

# Testing
# Manual testing required - switch between Map and Incidents tabs

# Build
npx expo prebuild --clean           # Regenerate native projects
```

### Commit Template

```
refactor(contexts): add shared incident subscription provider

- Create IncidentSubscriptionContext with single NDK subscription
- Disable default location fallback (wait for real GPS)
- Simplify MapScreen and IncidentFeedScreen to use useSharedIncidents
- Update provider hierarchy in App.tsx
```

---

## Context Notes

**Provider Nesting Rule**: `IncidentSubscriptionProvider` must be INSIDE `IncidentCacheProvider` so it can call `useIncidentCache()` for centralized caching.

**NDK Import**: Always import from `@nostr-dev-kit/mobile`, never from `@nostr-dev-kit/ndk` or `@nostr-dev-kit/react`.

**Location States**:
- `source: 'fresh'` - Real GPS coordinates
- `source: 'cached'` - Recent GPS from expo-location cache
- `source: 'none'` - No location yet (shows loading)

**UX Tradeoff**: Disabling default location means 3-4 second wait for GPS on app launch. Both screens show loading skeletons during this time. This eliminates the race condition entirely.
