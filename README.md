# Eventinel

Eventinel is a mobile app for local incident awareness on Nostr. It helps a user see nearby incident activity on a map, scan the same activity in a distance-first feed, and open one incident for more detail, comments, directions, or sharing.

## Current Status

Eventinel is currently an early mobile proof of concept and active development build. The repo shows working map, feed, incident detail, Nostr login, relay management, and push registration plus client-side notification handling, but it also shows ongoing work to stabilize incident subscriptions, Date Range refresh behavior, and in-app alert behavior. This README describes the app as an early implementation, not as a beta, deployed service, or production-ready public safety platform.

## Current Constraints

Access is signer-gated, nearby results depend on location and connected relays, and some core incident-subscription and alerting behaviors are still being stabilized. Treat the app as an early mobile implementation rather than a finished operational network.

## Product Purpose

Eventinel's current purpose is day-to-day local incident awareness. A user opens the app to understand what incidents are nearby, scan the closest activity quickly, and stay with one incident long enough to read its details, follow comments, get directions, or share it. The current product is about clearer local incident context on mobile.

## Current Capabilities

- Nearby incident map browsing
- Distance-first incident feed
- Incident detail view
- Comments, share, and directions actions
- Nostr signer-based login
- Relay management
- Date Range controls
- Push registration and client-side notification handling

## Planned or Experimental Work

The repo also contains work that should be described as planned, experimental, or still in progress. That includes functional map search, continued hardening of Date Range and incident toast behavior, broader reporting or alerting features, background or closed-app alert behavior, wallet or payment-related work that is still gated, and other roadmap items that should not be presented as already shipped.

## Local Setup

```bash
cp .env.example .env.local
npm install
npm start
```

Default app entrypoints:
- `index.ts`
- `App.tsx`

## Run on Device

- Use a development build for full app behavior. This project depends on native modules (for example Mapbox), so Expo Go is not sufficient for complete testing.
- Android:
  - Start an emulator or connect a device with USB debugging enabled.
  - Run `npm run android` to build/install and launch the development build.
- iOS (macOS required):
  - Start an iOS simulator or connect a device configured for local development.
  - Run `npm run ios` to build/install and launch the development build.
- Metro:
  - Run `npm start` when you need to start or restart the Metro bundler manually.
- Expo Go:
  - `npm start` + QR scanning can be used for limited JS-only checks, but native-feature parity is not guaranteed.

## Development Commands

- `npx tsc --noEmit`
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run test:auth`
- `npm run android | npm run ios | npm run web`
