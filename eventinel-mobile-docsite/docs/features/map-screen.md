---
title: Map Screen
description: User-facing guide for map interactions and visual states.
---

`MapScreen` is documented here at the UX level only.

As of `2026-02-16`, map UI and viewport subscription responsibilities are split
into `screens/MapScreen.tsx`, `screens/map/MapOverlays.tsx`, and
`screens/map/useMapViewportSubscription.ts`.

## Entry point

- Bottom tab: `Map`

## Core behaviors

## Location-first render

- Uses shared location provider.
- Shows map skeleton while loading.
- Shows location-required empty state if permission/location is unavailable.

## Incident rendering

- Incidents are shown as map points with clustering.
- Cluster selection zooms into that area.
- Selecting a single incident marker opens Incident Detail.

## Camera controls

- Includes "fly to my location" floating action button.
- Follow mode resumes automatically after user interactions.

## Relay awareness

- If relays are disconnected or unavailable, a top banner explains status and
  links to Relay Settings.

## Viewport subscription hinting

- When focused viewport is not covered by active subscription grid, map displays
  a hint to zoom in.
- Focus changes clear viewport anchor and subscription viewport state.

## Developer overlays

- In dev builds, overlay diagnostics show incident count, EOSE status, and
  location source metadata.

## Empty state

- After historical data is received, map shows "No incidents found" when none
  are available in scope.

## Scope note

Detailed subscription planning internals (viewport anchoring, geohash cell
reconciliation, and active cell management) are intentionally deferred while
those modules are under active development.

See:

- [Map Overlays And Viewport Subscription](../architecture/map-overlays-and-viewport-subscription)
- [Incident Subscription Refactor (Deferred)](../deferred/incident-subscription-refactor)
