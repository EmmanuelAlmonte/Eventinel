---
title: Wallet And Payments
description: Configure Lightning NWC and Cashu wallet workflows.
---

`WalletScreen` supports two payment systems:

- Lightning via Nostr Wallet Connect (NWC / NIP-47)
- Cashu ecash via NIP-60 wallet events

## Entry point

- Profile -> Settings -> `Wallet`

## Lightning (NWC)

## Connect

- Paste `nostr+walletconnect://...` pairing URI.
- URI is parsed and persisted for reconnect on app restart.

## Readiness and balance

- Shows wallet status (`initial`, `loading`, `ready`, `failed`).
- Tracks balance updates from wallet events.

## Payment actions

- Pay invoice: submit BOLT11 invoice.
- Create invoice: set amount + description and generate invoice.
- Copy generated invoice to clipboard.

## Disconnect

- Clears stored pairing code.
- Disconnects NWC relay connections.

## Cashu (NIP-60)

## Create wallet

- Provide one or more mint URLs.
- Optionally provide wallet relay URLs.
- Creates and starts NIP-60 wallet from current user context.

## Deposit flow

- Enter satoshi amount.
- Generate Lightning deposit invoice.
- Copy invoice and pay externally to mint ecash.

## Receive token

- Paste `cashu...` token string to import funds.

## Notes

- Cashu wallet management requires authenticated user session.
- NWC and Cashu errors surface as in-app toast messages.
