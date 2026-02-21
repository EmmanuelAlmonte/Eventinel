---
title: Incident Subscription Refactor (Deferred)
description: Tracking document for unstable subscription internals under active change.
---

This page tracks actively changing incident subscription internals and is not a
final architecture spec.

## Why deferred

- Behavior in this area is still being refactored.
- Deep algorithm docs would drift quickly and become incorrect.
- We maintain scope notes here until internals stabilize.

## Active paths

- `hooks/useIncidentSubscription.ts`
- `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`
- `contexts/IncidentSubscriptionContext.tsx`
- `lib/map/geohashViewport.ts`
- `lib/map/subscriptionPlanner.ts`

## What is currently known

- Public import surface now points to core implementation in
  `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`.
- Subscription state depends on map focus, viewport coverage, and planned geohash cells.
- Queueing and reconciliation are handled by internal hook modules.

## What is intentionally not documented yet

- Final geohash anchoring strategy.
- Final viewport soft/hard coverage thresholds.
- Final active subscription key lifecycle and pruning guarantees.
- Final event buffering and replay behavior guarantees.

## Promotion checklist (move from deferred to architecture)

- No major internal file moves for at least one iteration window.
- Subscription planner and viewport coverage thresholds are agreed.
- Public outputs and lifecycle semantics are verified by tests.
- At least one end-to-end behavior guide is updated and validated against code.
