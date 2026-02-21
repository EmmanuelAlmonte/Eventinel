---
title: Incident Feed
description: Stable list-view behavior for incident browsing.
---

`IncidentFeedScreen` is the list alternative to map browsing.

As of `2026-02-16`, this page reflects the modular feed implementation in
`screens/incidentFeed/*`.

## Entry point

- Bottom tab: `Incidents`

## Shared data source

- Feed reads from the same shared incident stream as map via `useSharedIncidents` from
  `contexts/IncidentSubscriptionContext.tsx`.
- `setFeedFocused(isFocused)` in `IncidentSubscriptionContext` helps gate subscription work
  when the tab is inactive.

## Card content model

Each incident row includes:

- Type icon and title
- Severity badge
- Short description preview
- Relative occurrence time
- Location/address preview

Selecting a row opens Incident Detail.

## Incident ordering

- Events are rendered by distance from current location first.
- Ties are broken by most recent occurrence time.
- The list is capped by shared `incident` rendering limits from `useSharedIncidents`.

## Screen states

### Focus-aware rendering

- Feed marks itself focused using `setFeedFocused(isFocused)` so subscriptions are only
  active for visible screens.
- While the tab is not focused, it renders an empty list to avoid unnecessary
  offscreen list rendering work.

### Location loading

- Shows loading header + skeleton list while location resolves.

### Location unavailable

- Shows location-required empty state with retry.

### Relay availability and banner behavior

- Relay warnings are shown when relay health is degraded; this includes empty feed and
  history states.
- Banner state is derived from relay health:
  - no relays: `No Relays Connected` with `Add Relay` action
  - connecting: `Connecting to relays` with waiting message
  - disconnected: `Relays disconnected` with `Relay Settings` action
- Banner action navigates to `Relays`.
- If relays are missing entirely, `NoRelaysEmpty` component is shown.

### Incident loading vs empty

- Before first history load: loading empty state.
- After history load with zero incidents: "All Clear" empty state.

## Rendering details

- List rendering uses `FlashList` for feed performance.
- Rows render through `IncidentRow`.
- Cards include severity badge, relative time, location, and optional source.

## Empty states

- Location loading shows header copy plus a skeleton list.
- Loading incidents show a `Loading...` message via `IncidentFeedEmpty`.
- Fully loaded and empty feed shows `All Clear`.
- Relay-health empty states:
  - no relays → add relay CTA,
  - relays present but disconnected/connecting → retry guidance and settings entrypoint.

## Notes

- Feed behavior is stable at the UI/state level.
- Backend incident subscription internals are under active refactor and are
  intentionally documented elsewhere only after stabilization.
