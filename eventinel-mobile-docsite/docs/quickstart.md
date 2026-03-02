---
title: Quickstart
description: Install, configure, and run Eventinel quickly.
---

This walkthrough gets the app running on local targets quickly.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure local environment

```bash
cp .env.example .env.local
```

Add `MAPBOX_ACCESS_TOKEN` to `.env.local`.

## 3. Start Expo and choose a target

```bash
npm start
```

From there, run one of the platform commands:

```bash
npm run android
npm run ios
npm run web
```

## 4. Validate changes before sharing

```bash
npx tsc --noEmit
npm test
```

## Next steps

- Review documentation priority in [Stability Scope](./stability-scope)
- Start with [Profile and Settings](./features/profile-settings)
- Continue with [Relay Management](./features/relay-management)
- Then cover [Login and Authentication](./features/login-authentication)
