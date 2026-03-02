---
title: init
description: Bootstrap the Eventinel workspace.
---

Use this workflow when setting up the project for the first time.

## Usage

```bash
npm install
cp .env.example .env.local
```

If you are on Windows PowerShell:

```bash
Copy-Item .env.example .env.local
```

## Examples

```bash
npm install
npm start
```

## Notes

- Set `MAPBOX_ACCESS_TOKEN` in `.env.local` before running the app.
- Keep secrets out of source control.
