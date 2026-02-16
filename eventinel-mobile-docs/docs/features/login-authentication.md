---
title: Login And Authentication
description: Stable operator guide for supported signer login methods.
---

`LoginScreen` supports multiple authentication methods.

## Supported methods

## Device signer (NIP-55, Android)

- Uses installed signer apps discovered on the device.
- Keys stay in signer app context.
- Recommended login path on Android.

## Remote signer (NIP-46)

- Accepts `bunker://...` or `name@domain` identifiers.
- Supports optional legacy NIP-04 toggle for compatibility.
- Can require external authorization URLs.

## Nostr Connect (NIP-46)

- Generates `nostrconnect://` URI from relay input.
- Supports copy URI and open signer app flows.
- Finalizes session after signer-side approval.

## Manual key login (testing)

- Accepts `nsec1...` or raw hex private key.
- Includes test-key generation helper.
- Should only be used for development/testing accounts.

## Session behavior

- Login uses persistent session flow (`login(signer, true)`).
- Session is restored on app startup until explicit logout.
