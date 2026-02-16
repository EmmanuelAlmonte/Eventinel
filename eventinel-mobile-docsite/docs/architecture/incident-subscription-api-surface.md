---
title: Incident Subscription API Surface
description: Public hook contract and internal boundary for incident subscriptions.
---

As of `2026-02-16`, public incident subscription access is intentionally narrow.

## Public surface

- `hooks/useIncidentSubscription.ts` is the public entry point.
- It re-exports:
  - `useIncidentSubscription` from `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`
  - public types from `hooks/incidentSubscription/types.ts`
  - `toProcessedIncident` from `hooks/incidentSubscription/sorting.ts`

## Why this exists

- Screen and context consumers import from one stable path.
- Runtime refactors can continue inside `hooks/incidentSubscription/*` without
  forcing broad callsite changes.

## Current contract expectations

- Consumers should treat outputs as view-oriented state:
  - `incidents`
  - `severityCounts`
  - `updatedIncidents`
  - loading/history metadata
- Consumers should avoid coupling to internal queueing, reconcile, and planner details.

## Internal-only modules

These are implementation details and should not be imported directly by screen
code unless explicitly promoted to public API:

- `hooks/incidentSubscription/eventReducer.ts`
- `hooks/incidentSubscription/reconcile.ts`
- `hooks/incidentSubscription/subscriptionRegistry.ts`
- `hooks/incidentSubscription/sorting.ts`
- `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`

## Stability note

- Public API path is stable.
- Internal algorithm behavior is actively changing and tracked in deferred docs.
