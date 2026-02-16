---
title: Map Overlays And Viewport Subscription
description: How map overlays and viewport subscription state are organized.
---

As of `2026-02-16`, map responsibilities are split between screen orchestration,
overlay UI, and viewport subscription logic.

## Components and hooks

- `screens/MapScreen.tsx`
  - Owns map composition, marker source/layers, and navigation actions.
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
4. Debounced updates emit `setMapSubscriptionViewport` and `setMapSubscriptionAnchor`.
5. Focus changes clear viewport/anchor and reset local coverage flags.

## Integration boundaries

- This layer coordinates map-visible subscription state only.
- Core subscription internals remain in the incident subscription subsystem and are documented separately.

## Current stability

- Overlay/UI behaviors are stable for docs.
- Coverage thresholds and planner internals are still moderate-stability areas.
