---
title: Incident Feed
description: Stable list-view behavior for incident browsing.
---

`IncidentFeedScreen` is the list alternative to map browsing.

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

## Location loading

- Shows loading header + skeleton list while location resolves.

## Location unavailable

- Shows location-required empty state with retry.

## Relay unavailable

- Shows no-relays or relay-disconnected guidance, with CTA to Relay Settings.

## Incident loading vs empty

- Before first history load: loading empty state.
- After history load with zero incidents: "All Clear" empty state.

## Notes

- Feed behavior is stable at the UI/state level.
- Backend incident subscription internals are under active refactor and are
  intentionally documented elsewhere only after stabilization.
