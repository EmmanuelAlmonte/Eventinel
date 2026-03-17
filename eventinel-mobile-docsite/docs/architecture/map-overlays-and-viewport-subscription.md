---
title: Map Overlays And Viewport Subscription
description: How map overlays and viewport subscription state are organized.
---

As of `2026-03-17`, map responsibilities are split between screen
orchestration, state composition, canvas rendering, camera control, overlay UI,
and viewport subscription logic.

## Components and hooks

- `screens/MapScreen.tsx`
  - Entry point that selects loading, empty, unavailable, or live-map branches.
- `screens/map/useMapScreenState.ts`
  - Composes shared location, relay, incident, and navigation state.
- `screens/map/MapScreenCanvas.tsx`
  - Owns Mapbox composition, incident `ShapeSource`, cluster layers, point layers, and user marker.
- `screens/map/useMapCamera.ts`
  - Owns follow-mode, cluster expansion, animation lifecycle, and auto-resume timers.
- `screens/map/MapOverlays.tsx`
  - Owns overlay UI: relay banner, location button, debug panels, viewport hint, empty state.
- `screens/map/useMapViewportSubscription.ts`
  - Owns viewport coverage evaluation and debounced subscription anchor updates.

## Overlay behavior

- Relay banner renders when relay status requires user action.
- Fly-to-location control is disabled while camera animation is active.
- Dev-only overlays show incident count, EOSE state, and location source diagnostics.
- Viewport hint appears when map focus is active but current viewport is outside coverage.
- Empty state appears only after history load with zero visible incidents.

## Viewport subscription behavior

1. `onMapIdle` reads center, bounds, and zoom from map camera state.
2. Hook computes coverage using geohash precision and center-grid radius.
3. Soft coverage thresholds allow minor gaps before marking viewport as uncovered.
4. If coverage is insufficient, the hook keeps the previous subscription anchor in place and exposes the uncovered state to the overlay layer.
5. Debounced updates emit `setMapSubscriptionViewport` and `setMapSubscriptionAnchor`.
6. Focus changes clear viewport/anchor and reset local coverage flags.

## Integration boundaries

- `useMapScreenState.ts` is the integration seam between shared incident
  subscription state and map rendering.
- The live incident map is rendered from a GeoJSON feature collection feeding a
  clustered `ShapeSource`; it does not mount one React marker component per
  incident.
- This layer coordinates map-visible subscription state only.
- Core subscription internals remain in the incident subscription subsystem and are documented separately.

## Current stability

- Overlay/UI behaviors are stable for docs.
- Coverage thresholds and planner internals are still moderate-stability areas.
