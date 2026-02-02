# Eventinel Mobile — Architecture (Short)

**Source of truth:** `docs/PROJECT_SUMMARY.md`

## High-Level Flow

1) `App.tsx` initializes NDK + session stores, loads relays, and mounts providers.
2) `LocationProvider` fetches GPS once and shares it to the app.
3) `IncidentSubscriptionProvider` subscribes to Nostr `kind:30911` events via `useIncidentSubscription` and shares incidents to screens.
4) `IncidentCacheProvider` stores incidents for detail lookup by `incidentId`.

## Core Modules

- **NDK singleton:** `lib/ndk.ts`
- **Incident parsing:** `lib/nostr/events/incident.ts`
- **Subscription logic:** `hooks/useIncidentSubscription.ts`
- **Incident cache:** `contexts/IncidentCacheContext.tsx`
- **Shared subscription:** `contexts/IncidentSubscriptionContext.tsx`
- **Location:** `contexts/LocationContext.tsx`

## Navigation

- Bottom tabs: Map, Incidents, Profile
- Stack routes: IncidentDetail, Relays
- Auth gate: Login screen when no current user

## Screen Responsibilities

- **MapScreen:** Mapbox view, markers, incident visualization
- **IncidentFeedScreen:** List view of shared incidents
- **IncidentDetailScreen:** Details + comments; resolves incident via cache
- **RelayConnectScreen:** Manage relay URLs
- **LoginScreen/ProfileScreen:** Auth and user settings

## Comments (Nostr)

- Comments are `kind:1` events with `#a`/`#e` tags scoped to an incident.
- Deletions use `kind:5` events.
- Profile metadata is fetched for display names/avatars.
