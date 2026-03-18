---
title: Map Screen
description: User-facing guide for map interactions and visual states.
---

`MapScreen` is documented here at the UX level first, with a light
implementation note where current ownership is useful for maintenance.

As of `2026-03-17`, current map responsibilities are split across:

- `screens/MapScreen.tsx`
  - Entry point that chooses loading, location-required, unavailable, or live-map rendering.
- `screens/map/useMapScreenState.ts`
  - Composes shared incident, location, relay, and navigation state for the screen.
- `screens/map/MapScreenCanvas.tsx`
  - Renders the Mapbox map, incident `ShapeSource`, cluster layers, point layers, and user marker.
- `screens/map/useMapCamera.ts`
  - Owns follow-mode, fly-to-user, cluster expansion camera movement, and auto-resume timing.
- `screens/map/MapOverlays.tsx`
  - Owns overlay UI: relay banner, location button, debug panels, viewport hint, and empty state.
- `screens/map/useMapViewportSubscription.ts`
  - Owns viewport coverage evaluation and debounced subscription anchor updates.

## Entry point

- Bottom tab: `Map`

## Core behaviors

- `MapScreen` is one consumer of the shared incident subscription context
  (`useSharedIncidents`). It does not manage subscription state itself.
- Shared incident updates cause the map to rebuild a GeoJSON feature collection
  for rendering; cache synchronization is handled separately by the shared
  incident subscription provider.

## Location-first render

- Uses shared location provider.
- Shows map skeleton while loading.
- Shows location-required empty state if permission/location is unavailable.

## Incident rendering

- Incidents are shown as clustered map points backed by a GeoJSON feature
  collection and Mapbox `ShapeSource` layers.
- The live map does not render one React marker component per incident.
- Cluster selection zooms into that area.
- Selecting a single incident marker opens Incident Detail.

## Camera controls

- Includes a **fly to my location** floating action button.
- Follow mode pauses when users pan/zoom.
- Follow mode can be resumed immediately with the location control.
- Follow mode also auto-resumes after the current idle timeout in
  `screens/map/useMapCamera.ts`.
- Cluster tap behavior:
  - calls Mapbox cluster expansion zoom,
  - animates camera to that zoom level and center,
  - then schedules follow handling to resume.

## Relay awareness

- If relays are disconnected or unavailable, a top banner explains status and
  links to Relay Settings.
- Banner logic is driven by `screens/map/helpers.ts` and only appears when relay
  status is non-healthy.

## Viewport subscription hinting

- `onMapIdle` events are funneled through `useMapViewportSubscription`.
- Off-grid viewports show **"Zoom in to load incidents for this area"**.
- Off-grid viewports do not advance the subscription anchor until coverage is
  acceptable again.
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
