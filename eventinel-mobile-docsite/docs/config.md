---
title: Configuration
description: Configure Eventinel Mobile environment and runtime behavior.
---

Eventinel Mobile reads configuration through environment files and Expo config.

## Resolution order

1. Command-line flags
2. `.env.local` in development mode
3. `.env` in production build mode
4. `app.config.js` values derived from env
5. Built-in defaults

## Common keys

| Key | Type | Description |
| --- | --- | --- |
| `MAPBOX_ACCESS_TOKEN` | string | Required token for map features. |

## Example

```json
{
  "MAPBOX_ACCESS_TOKEN": "pk.your_token_here"
}
```
