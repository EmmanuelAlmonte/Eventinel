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
- Incident detail behavior
- Incident feed behavior

## Moderate stability

The map screen UX is documented at a user-behavior level (markers, clustering,
empty states, relay banners, and location controls), but not low-level
subscription algorithms.

## Deferred for now

The incident subscription internals are actively changing. Deep technical docs
for geohash planning, viewport anchoring, and reconciliation should wait until
that refactor settles:

- `hooks/useIncidentSubscription.ts`
- `contexts/IncidentSubscriptionContext.tsx`
- `lib/map/subscriptionPlanner.ts`
- `lib/map/geohashViewport.ts`
