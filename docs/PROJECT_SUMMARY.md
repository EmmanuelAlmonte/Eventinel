# Eventinel Mobile — Source of Truth Summary

This document is the canonical, code-aligned overview of Eventinel Mobile. If other docs conflict with this file, this file wins.

## Goal and Scope
Eventinel Mobile is a Nostr-native public safety awareness app. It displays local incidents on a map and list, with drill-down detail. Incidents are sourced from Nostr relays as `kind:30911` events. This repo is **mobile-only** (React Native + Expo) and does **not** include backend ingestion services.

## How Data Flows
1. **NDK init + session restore**
   - `App.tsx` initializes NDK and session stores, then loads saved relays.
2. **Location**
   - `LocationProvider` fetches GPS once and shares it to screens.
3. **Incident subscription**
   - `useIncidentSubscription` subscribes to `kind:30911` with geohash tags and history limits.
4. **Parsing + sorting**
   - `parseIncidentEvent` validates and normalizes events.
5. **Shared state + cache**
   - `IncidentSubscriptionProvider` shares incidents to screens.
   - `IncidentCacheProvider` stores incidents for detail lookups by `incidentId`.

**Important:** If relays have no `kind:30911` events, the app will show zero incidents. This repo does not publish or ingest incidents on its own.

## Navigation and Screens
- **Bottom tabs:** Map, Incidents (feed), Profile
- **Stack routes:** IncidentDetail, Relays
- **Auth gate:** Login screen renders when no current user

## Event Model (Nostr)
- **Incident events:** `kind:30911` (parameterized replaceable)
- **Key tags:**
  - `d` incident ID
  - `l` lat,lng (precise)
  - `g` geohash (NIP-52)
  - `type`, `severity`, `source`, `address`
  - `t` hashtags: `eventinel`, `incident`, `{type}`
- **Content JSON:** title, description, lat/lng, type, severity, occurredAt, source, city/state, metadata
- **Comments:** `kind:1` with `#a` and `#e` threading tags; deletions use `kind:5`

## Key Config Values (from code)
- **Geohash precision:** `DEFAULT_GEOHASH_PRECISION` (see `lib/nostr/config.ts`)
- **Incident subscription limits:** `INCIDENT_LIMITS` in `lib/map/constants.ts`
  - `MAX_CACHE`: 250 (displayed incidents)
  - `FETCH_LIMIT`: 100 (subscription limit)
  - `SINCE_DAYS`: 30 (history window)
- **Detail cache size:** `MAX_CACHE_SIZE` = 500 in `contexts/IncidentCacheContext.tsx`

## Tech Stack (Current)
- **React Native** 0.79.6 + **Expo** 53.0.9
- **NDK Mobile** `@nostr-dev-kit/mobile@0.9.3-beta.70`
- **Mapbox** `@rnmapbox/maps@10.2.10`
- **UI** `@rneui/themed`
- **State** Context providers + NDK’s internal Zustand stores

## What’s Missing (MVP Gaps)
- A production incident publisher/ingestion pipeline
- Push notification backend (Expo/FCM setup exists but no server pipeline here)

## Where to Look Next
- **Changelog:** `docs/CHANGELOG.md`
- **Launch/ops checklist:** `docs/LAUNCH_CHECKLIST.md`
- **Push setup:** `docs/PUSH_NOTIFICATIONS_SETUP.md`
- **Risks:** `docs/RESIDUAL_RISKS.md`
- **NDK beta tasks:** `docs/NDK_BETA_TASKS.md`
