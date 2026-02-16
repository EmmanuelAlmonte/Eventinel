---
title: Installation
description: Set up a local Eventinel Mobile development environment.
---

Use this guide to install dependencies and prepare the app for local development.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- Expo tooling via project dependencies
- Android Studio and/or Xcode for native device builds

## Install dependencies

```bash
npm install
```

## Configure environment values

Create `.env.local` for development:

```bash
cp .env.example .env.local
```

If you are on Windows PowerShell:

```bash
Copy-Item .env.example .env.local
```

Set `MAPBOX_ACCESS_TOKEN` in `.env.local` before launching the app.

## Start Metro

```bash
npm start
```
