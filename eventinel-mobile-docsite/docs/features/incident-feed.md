---
title: Incident Feed
description: Stable list-view behavior for incident browsing.
---

`IncidentFeedScreen` is the list alternative to map browsing.

As of `2026-02-16`, this page reflects the modular feed implementation in
`screens/incidentFeed/*`.

## Entry point

- Bottom tab: `Incidents`

## Card content model

Each incident row includes:

- Type icon and title
- Severity badge
- Short description preview
- Relative occurrence time
- Location/address preview

Selecting a row opens Incident Detail.

## Screen states

### Focus-aware rendering

- Feed marks itself focused using `setFeedFocused(isFocused)`.
- While the tab is not focused, it renders an empty list to avoid unnecessary
  offscreen list work.

### Location loading

- Shows loading header + skeleton list while location resolves.

### Location unavailable

- Shows location-required empty state with retry.

### Relay availability and banner behavior

- Relay warnings are shown only when incidents are present and no relay is
  currently connected.
- Banner state is derived from relay health:
  - no relays: `No Relays Connected` with `Add Relay` action
  - connecting: `Connecting to relays` with waiting message
  - disconnected: `Relays disconnected` with `Relay Settings` action
- Banner action navigates to `Relays`.

### Incident loading vs empty

- Before first history load: loading empty state.
- After history load with zero incidents: "All Clear" empty state.

## Rendering details

- List rendering uses `FlashList` for feed performance.
- Rows render through `IncidentRow`, which uses `IncidentCard`.
- Cards include severity badge, relative time, location, and optional source.

## Notes

- Feed behavior is stable at the UI/state level.
- Backend incident subscription internals are under active refactor and are
  intentionally documented elsewhere only after stabilization.
