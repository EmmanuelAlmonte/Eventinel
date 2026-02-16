---
title: Login And Authentication
description: Stable operator guide for supported signer login methods.
---

`LoginScreen` supports multiple authentication methods.

As of `2026-02-16`, this page reflects the split login flow implemented in
`screens/login/LoginSections.tsx` and `screens/login/useLoginMethods.ts`.

## Supported methods

### Device signer (NIP-55, Android)

- Uses installed signer apps discovered on the device.
- Keys stay in signer app context.
- Recommended login path on Android.

### Remote signer (NIP-46)

- Accepts `bunker://...` or `name@domain` identifiers.
- Supports optional legacy NIP-04 toggle for compatibility.
- Can require external authorization URLs.
- Rejects `nostrconnect://` values here and routes users to the dedicated
  Nostr Connect flow instead.

### Nostr Connect (NIP-46)

- Generates `nostrconnect://` URI from relay input.
- Supports copy URI and open signer app flows.
- Finalizes session after signer-side approval.

### Manual key login (testing)

- Accepts `nsec1...` or raw hex private key.
- Includes test-key generation helper.
- Should only be used for development/testing accounts.

### Generated dev key helper

- Can generate an ephemeral private key in-app.
- Copies generated `nsec` to clipboard when available.
- Allows immediate login with the generated signer after review.

## Session behavior

- Login uses persistent session flow (`login(signer, true)`).
- Session is restored on app startup until explicit logout.
