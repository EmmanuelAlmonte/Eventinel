---
title: Relay Management
description: Manage relay endpoints, status, and local persistence.
---

Relay management is handled in `RelayConnectScreen`.

## Entry point

- Profile tab -> Settings card -> `Relay Settings`

## Relay lifecycle actions

## Add relay

- Enter relay URL in the add form.
- Supported schemes: `wss://` and `ws://`.
- New relays are added to NDK pool and persisted to local storage.

## Reconnect relay

- Use per-row reconnect action for a specific relay.

## Remove relay

- Use per-row remove action and confirm.
- Relay is removed from pool and local storage.

## Status indicators

Each relay row includes:

- Canonical relay URL
- Status text (`connected`, `connecting`, `disconnected`, etc.)
- Semantic status color and status dot

## Dev-only mode

In development builds, a local relay toggle is available:

- Toggle on: switches saved relays to the local relay list
- Toggle off: restores default relay list

## Persistence behavior

- Relay list is stored locally.
- Saved relays are restored and reconnected on startup.
