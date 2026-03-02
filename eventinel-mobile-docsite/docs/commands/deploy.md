---
title: deploy
description: Build and release Eventinel artifacts.
---

This repository does not define a single `npm run deploy` script, so release
work is usually handled through Expo and EAS tooling.

## Usage

```bash
npx tsc --noEmit
npm test
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Examples

```bash
npx tsc --noEmit
npm run test:coverage
npx eas build --platform android --profile production
```

## Notes

- Ensure production env values are in `.env`.
- Keep release credentials in your CI/CD secret manager.
