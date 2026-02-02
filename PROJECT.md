# Project

Eventinel Mobile is a React Native + Expo app that displays local safety incidents sourced from Nostr relays as kind:30911 events. The app is mobile-only and relies on NDK Mobile for subscriptions, caching, and session persistence.

## Goals
- Real-time incident awareness via map and feed views
- Nostr-native data flow (no REST polling for incidents)
- Offline-capable cache via SQLite
- Clear, stable navigation for map, feed, and profile flows

## Non-Goals
- Backend ingestion services live outside this repo
- Web app or server APIs are not part of this repo

## Architecture Snapshot
- NDK singleton with SQLite cache (lib/ndk.ts)
- Shared location and incident subscription providers (contexts/)
- Mapbox map with markers (screens/MapScreen.tsx)
- Feed and detail screens (screens/IncidentFeedScreen.tsx, screens/IncidentDetailScreen.tsx)
- Comments are Nostr kind:1 scoped to incidents

## Canonical Docs
- docs/PROJECT_SUMMARY.md
- docs/README.md
- docs/ARCHITECTURE.md
- docs/MOBILE_ROADMAP.md
