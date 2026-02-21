---
title: Location Provider Architecture
description: Shared location state and lifecycle across screens.
---

Location is centralized through `LocationProvider` to prevent per-screen
location race conditions.

## Core pattern

- `LocationProvider` wraps app navigation in `App.tsx`
- `useSharedLocation()` exposes one shared location state to consumers
- `useUserLocation()` executes location acquisition once at provider mount

## Why this exists

Without shared context, separate hooks on Map and Feed can resolve different
sources (fresh GPS vs fallback/cached) at different times.

This provider ensures all screens read the same current location state.

## Returned state shape

`useSharedLocation()` exposes:

- `location` `[longitude, latitude] | null`
- `permission` status
- `source` (`fresh`, `cached`, `default`, `none`)
- `isLoading`
- `error`
- `refresh()`

## Fetch behavior

`useUserLocation()` sequence:

1. Check/request foreground location permission
2. Attempt last-known location first
3. Attempt fresh location via `watchPositionAsync` with timeout
4. Apply configured fallback behavior if needed

In this app, provider config uses `fallback: 'none'` to avoid default-location
drift between screens.

## Optional gate

`LocationGate` is available for components that should not mount until a valid
location is present.
