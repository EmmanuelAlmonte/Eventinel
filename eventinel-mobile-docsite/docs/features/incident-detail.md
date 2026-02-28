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

- Reads incident from shared incident cache first (`useIncidentCache` in `IncidentCacheContext`).
- If not found, attempts read-through fetch from relays via `fetchIncidentFromRelay`.
- Shows a 2-second loading window before falling into not-found fallback.
- Successfully fetched incidents are cached through `useIncidentRecord` using
  `useIncidentCache.upsertMany`.

## Screen module structure

- `IncidentDetailLoadingState` for loading/error transitions.
- `IncidentDetailHeaderBar` for back/share and live indicator.
- `IncidentDetailMiniMap` for location context.
- `IncidentDetailInfoCards` for type/severity/location metadata cards.
- `IncidentCommentsSection` for timeline, stale-state banner, and deletion notices.
- `IncidentDetailActionBar` for authenticated composer or guest quick actions.
- `IncidentDetailScreenView` composes all subcomponents into a single layout.

## Data and UI flow

1. Route params arrive in `IncidentDetailScreen`.
2. `useIncidentRecord` resolves incident state from cache, otherwise reads through relays.
3. `useIncidentCommentsController` resolves comments and comment actions.
4. `IncidentDetailScreenView` renders map/info/comments and action rail.
5. If no incident is resolvable, the loading state chooses between:
   - **Loading incident...** while fetching
   - **Incident not available** when fallback timeout or fetch failure is reached

## Actions

### Share

- Native share flow with incident title/location summary.

### Directions

- Opens platform maps app with destination coordinates.
- URL schema uses `maps://` on iOS and `geo:` on Android.

### Comments

- Lists incident comments with relative timestamps.
- Comments are shown in reverse chronological order with relative time.
- Supports posting comments for signed-in users.
- Supports deleting own comments.
- Shows stale/relay delay retry messaging via explicit banner.
- Shows recent deletion feedback when relay deletion requests succeed.

### Media in comments

- Supports media picker + NIP-96 upload.
- Uploaded URL is appended to comment composer text.
- Requires upload endpoint configuration.
- Error path shows a toast when upload endpoint env vars are missing.

## Related architecture docs

- [Incident Detail Modules](../architecture/incident-detail-modules)
- [Incident Subscription API Surface](../architecture/incident-subscription-api-surface)
