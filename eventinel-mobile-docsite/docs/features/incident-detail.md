---
title: Incident Detail
description: Stable user-facing behavior for the incident detail screen.
---

`IncidentDetailScreen` is the full detail experience for a single incident.

As of `2026-02-16`, this page reflects the split implementation under
`screens/incidentDetail/*`.

## Route parameters

- `incidentId` (required)
- `eventId` (optional)

## Data lookup behavior

- Reads incident from local cache first.
- If not found, attempts read-through fetch from relay.
- Shows loading state before not-found fallback.

## Screen module structure

- `IncidentDetailHeaderBar` for back/share and live indicator.
- `IncidentDetailMiniMap` for location context.
- `IncidentDetailInfoCards` for type, severity, metadata, location, and description.
- `IncidentCommentsSection` for comment timeline and moderation affordances.
- `IncidentDetailActionBar` for composer or guest actions.
- `IncidentDetailLoadingState` for loading and not-found transitions.

## Actions

### Share

- Native share flow with incident title/location summary.

### Directions

- Opens platform maps app with destination coordinates.

### Comments

- Lists incident comments with relative timestamps.
- Supports posting comments for signed-in users.
- Supports deleting own comments.
- Includes stale/relay delay retry messaging.
- Shows recent deletion feedback when relay deletion requests succeed.

### Media in comments

- Supports media picker + NIP-96 upload.
- Uploaded URL is appended to comment composer text.
- Requires upload endpoint configuration.

## Related architecture docs

- [Incident Detail Modules](../architecture/incident-detail-modules)
- [Incident Subscription API Surface](../architecture/incident-subscription-api-surface)
