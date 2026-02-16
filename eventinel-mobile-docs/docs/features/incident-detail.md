---
title: Incident Detail
description: Stable user-facing behavior for the incident detail screen.
---

`IncidentDetailScreen` is the full detail experience for a single incident.

## Route parameters

- `incidentId` (required)
- `eventId` (optional)

## Data lookup behavior

- Reads incident from local cache first.
- If not found, attempts read-through fetch from relay.
- Shows loading state before not-found fallback.

## Main content

- Header with back action, live indicator, and share action.
- Mini-map centered on incident coordinates.
- Incident type, severity badge, title, and occurred time.
- Location card and incident description.
- Source metadata display.

## Actions

## Share

- Native share flow with incident title/location summary.

## Directions

- Opens platform maps app with destination coordinates.

## Comments

- Lists incident comments with relative timestamps.
- Supports posting comments for signed-in users.
- Supports deleting own comments.
- Includes stale/relay delay retry messaging.

## Media in comments

- Supports media picker + NIP-96 upload.
- Uploaded URL is appended to comment composer text.
- Requires upload endpoint configuration.
