---
title: Examples
description: Practical command sequences for Eventinel workflows.
---

## Local development cycle

```bash
npm install
cp .env.example .env.local
npm start
npm run android
```

## Auth-focused test run

```bash
npx tsc --noEmit
npm run test:auth
```

## Pre-release validation and build

```bash
npx tsc --noEmit
npm run test:coverage
npx eas build --platform android --profile production
```
