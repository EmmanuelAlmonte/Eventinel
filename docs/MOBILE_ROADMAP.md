# Eventinel Mobile — Roadmap (Short)

**Source of truth:** `docs/PROJECT_SUMMARY.md`

## Current State (Implemented)

- NDK init + relay management
- Map view + incident markers
- Incident feed + incident detail
- Comments in incident detail
- Shared location + incident subscription providers

## Near-Term Priorities

1) **Incident publishing pipeline**
   - Provide a test publisher script and/or ingestion service so relays have real `kind:30911` events.

2) **Push notifications**
   - Set up Expo/FCM pipeline and a backend to send alerts based on user radius.

3) **Protected places & radius settings**
   - Saved locations with alert radius and severity preferences.

## Mid-Term Improvements

- Feed filters + pagination
- Map clustering and density handling
- Offline UX polish (stale banners, last-updated timestamps)

## Long-Term

- Community incident reporting and moderation
- Additional data sources (ingestion expansion)
