---
title: config
description: Manage environment and app configuration values.
---

Eventinel uses environment files and `app.config.js` to resolve runtime
settings.

## Usage

```bash
cp .env.example .env.local
cp .env.example .env
```

If you are on Windows PowerShell:

```bash
Copy-Item .env.example .env.local
Copy-Item .env.example .env
```

## Key values

| Key | Where to set it | Description |
| --- | --- | --- |
| `MAPBOX_ACCESS_TOKEN` | `.env.local` / `.env` | Required for map rendering and location views. |

## Examples

```bash
cp .env.example .env.local
npm start
```
