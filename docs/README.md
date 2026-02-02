# Eventinel Mobile (Docs)

This repo is the **mobile-only** Eventinel app (React Native + Expo), built around Nostr `kind:30911` incident events.

**Source of truth:** `docs/PROJECT_SUMMARY.md`

## Quick Start

1) Create local env file (required for Mapbox):
```bash
cp .env.example .env.local
```
Set `MAPBOX_ACCESS_TOKEN` in `.env.local`.

For production builds, copy `.env.example` to `.env` instead.

2) Install and run:
```bash
npm install
npm start
```

3) Platform targets:
```bash
npm run ios
npm run android
npm run web
```

## Key Commands

```bash
npx tsc --noEmit
npm test
npm run test:coverage
```

## Data Notes

- Incidents are loaded from Nostr relays as `kind:30911` events.
- If relays have no incident events, the app will show zero incidents.
- Add/manage relays in the Profile > Relay Settings screen.

## Where to Look Next

- Canonical summary: `docs/PROJECT_SUMMARY.md`
- Architecture (short): `docs/ARCHITECTURE.md`
- Roadmap (short): `docs/MOBILE_ROADMAP.md`
