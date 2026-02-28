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

- `MapScreen` is one consumer of the shared incident subscription context
  (`useSharedIncidents`). It does not manage subscription state itself.

## Location-first render

- Uses shared location provider.
- Shows map skeleton while loading.
- Shows location-required empty state if permission/location is unavailable.

## Incident rendering

- Incidents are shown as map points with clustering.
- Cluster selection zooms into that area.
- Selecting a single incident marker opens Incident Detail.

## Camera controls

- Includes a **fly to my location** floating action button.
- Follow mode pauses when users pan/zoom; resume happens when the control is used.
- Cluster tap behavior:
  - calls Mapbox cluster expansion zoom,
  - animates camera to that zoom level and center,
  - then resumes follow handling.

## Relay awareness

- If relays are disconnected or unavailable, a top banner explains status and
  links to Relay Settings.
- Banner logic is driven by `screens/map/helpers.ts` and only appears when relay
  status is non-healthy.

## Viewport subscription hinting

- `onMapIdle` events are funneled through `useMapViewportSubscription`.
- Off-grid viewports show **"Zoom in to load incidents for this area"**.
- Focus changes clear viewport anchor and subscription viewport state.

## Developer overlays

- In dev builds, overlay diagnostics show incident count, EOSE status, and
  location source metadata.
- Additional debug overlays show:
  - incident list size,
  - `EOSE` state,
  - location freshness and permission source.

## Empty state

- After historical data is received, map shows "No incidents found" when none
  are available in scope.
- This only appears after `hasReceivedHistory === true`; initial fetch windows
  keep loading semantics.

## Scope note

Detailed subscription planning internals (viewport anchoring, geohash cell
reconciliation, and active cell management) are intentionally deferred while
those modules are under active development.

See:

- [Map Overlays And Viewport Subscription](../architecture/map-overlays-and-viewport-subscription)
- [Incident Subscription Refactor (Deferred)](../deferred/incident-subscription-refactor)
