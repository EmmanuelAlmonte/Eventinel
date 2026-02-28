---
title: Stability Scope
description: Documentation focus based on current implementation stability.
---

This documentation set intentionally prioritizes features with lower recent churn.

## Stable first

The following areas are currently the best candidates for durable user-facing docs:

- Profile and settings flows
- Relay management
- Login and signer authentication flows
- Incident detail behavior and module split
- Incident feed behavior

## Moderate stability

- Map screen UX and overlay composition are stable enough for user-facing docs.
- Viewport coverage thresholds and subscription anchor behavior remain
  moderate-stability internals.

## Deferred for now

The incident subscription internals are actively changing. Deep technical docs
for geohash planning, viewport anchoring, and reconciliation should wait until
that refactor settles:

- `hooks/useIncidentSubscription.ts`
- `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`
- `contexts/IncidentSubscriptionContext.tsx`
- `lib/map/subscriptionPlanner.ts`
- `lib/map/geohashViewport.ts`

Track these in:

- [Incident Subscription Refactor (Deferred)](./deferred/incident-subscription-refactor)
