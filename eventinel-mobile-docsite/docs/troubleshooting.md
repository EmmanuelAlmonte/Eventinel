---
title: Troubleshooting
description: Common Eventinel Mobile setup and runtime issues.
---

## `expo` or `npm` command not found

- Confirm Node and npm are installed.
- Run `npm install` from the repository root.
- Restart your shell to refresh `PATH`.

## Map view is blank

- Verify `MAPBOX_ACCESS_TOKEN` is present in `.env.local`.
- Restart Metro after changing environment files.
- Confirm `app.config.js` is reading the expected env file.

## Android/iOS native build fails

- Clear caches and rebuild:

```bash
npx expo start -c
npm run android
```
