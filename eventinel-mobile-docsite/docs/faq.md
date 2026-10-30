---
title: FAQ
description: Frequently asked questions about Eventinel.
---

## What Node.js versions are supported?

Use Node.js 24.22.1 or later on the 24.x line; `.nvmrc` pins 24.22.2. Earlier 24.x releases have known security issues.

## Which commands do I run most often?

`npm start`, `npm run android`, `npm run ios`, and `npm run web`.

## Where do environment values go?

Use `.env.local` for development and `.env` for production builds.

## How do I get detailed logs?

Run Expo with cache clear and inspect Metro output:

```bash
npx expo start -c
```
