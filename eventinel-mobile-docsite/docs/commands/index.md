---
title: Commands
description: Command and workflow reference for Eventinel Mobile.
---

Use this section as the source of truth for local scripts and release workflows.

## Command guides

| Command | Description |
| --- | --- |
| [`init`](./init) | Bootstrap the workspace and environment files. |
| [`run`](./run) | Start Expo and run platform targets. |
| [`deploy`](./deploy) | Prepare release artifacts for distribution. |
| [`config`](./config) | Manage environment and app configuration values. |

## Common scripts

These scripts are used most often during development:

- `npm start` starts Expo Metro
- `npm run android` runs Android target
- `npm run ios` runs iOS target
- `npm run web` runs web target
- `npx tsc --noEmit` performs TypeScript checks
- `npm test` runs Jest tests

## Adding new command docs

Use `docs/commands/_template.md` as the base structure for new command pages.
