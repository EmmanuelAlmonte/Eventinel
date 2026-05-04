---
title: Incident Detail Modules
description: Architecture of the split Incident Detail screen implementation.
---

As of `2026-02-16`, `IncidentDetailScreen` has been split into focused modules
under `screens/incidentDetail/*`.

## Module layout

- `screens/IncidentDetailScreen.tsx` coordinates route params, theme, and composition.
- `screens/incidentDetail/IncidentDetailHeaderBar.tsx` owns top bar actions.
- `screens/incidentDetail/IncidentDetailMiniMap.tsx` renders location context.
- `screens/incidentDetail/IncidentDetailInfoCards.tsx` renders metadata cards.
- `screens/incidentDetail/IncidentReportMediaSection.tsx` renders report media from incident event metadata.
- `screens/incidentDetail/IncidentCommentsSection.tsx` renders comments and deletion affordances.
- `screens/incidentDetail/IncidentDetailActionBar.tsx` renders composer or guest actions.
- `screens/incidentDetail/IncidentDetailLoadingState.tsx` handles loading/not-found UX.
- `screens/incidentDetail/useIncidentRecord.ts` handles cache-first incident resolution.
- `screens/incidentDetail/useIncidentCommentsController.ts` handles text-only comment actions.

## Data flow

1. Screen receives `incidentId` and optional `eventId`.
2. `useIncidentRecord` checks cache, then attempts read-through relay fetch.
3. Screen derives type config and severity tokens for UI modules.
4. `useIncidentCommentsController` binds comment feed, submit, and delete actions.
5. Child modules render pure UI with callbacks/state from screen-level hooks.

## Comments behavior

- Comment composer is available only for authenticated users.
- Comments are text-only.
- Comments do not own Blossom upload, media metadata tags, server-list lookup, or media preview rendering.
- Blossom media support belongs to the Report Incident flow and incident event surfaces.
- Deletion is limited to author-owned comments.
- Recent deletions and stale comment state are surfaced in the comments section.

## Report media behavior

- Incident events can carry report media metadata from Report Incident submissions.
- `parseIncidentEvent` exposes parsed media descriptors on the incident model.
- Incident detail renders report image media through `IncidentReportMediaSection`.
- Unsupported video remains a blocked placeholder until playback is explicitly approved.

## Platform integrations

- Share uses native `Share.share`.
- Directions open native map intents:
  - iOS: `maps://`
  - Android: `geo:`

## Current stability

- UI module split is stable enough for architecture documentation.
- Internal comment transport behavior can still evolve with relay/subscription updates.
