# Eventinel

Eventinel is an open-source React Native/Expo app for local public safety incident awareness on Nostr. The current MVP/beta provides incident map, feed, and detail workflows on mobile using Nostr-native incident events (`kind:30911`).

Eventinel is built with a no-surveillance architecture: no surveillance pipeline is part of the app design.

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
