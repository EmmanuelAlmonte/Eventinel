# Cashu Mini Wallet UI/UX Manual Checklist

Date: 2026-02-20
Scope: `http://127.0.0.1:8787`

## Environment
- Start mint: `npm run cashu:mint:up`
- Start wallet UI: `npm run cashu:web:wallet`

## Desktop Checklist
- [ ] Step flow renders in order: Connect Mint -> Top Up Wallet -> Send or Receive -> Activity.
- [ ] Top Up and Send/Receive are locked before mint connection.
- [ ] Connect Mint unlocks Top Up and Send/Receive.
- [ ] Missing quote ID disables `Check` and `Mint Proofs`.
- [ ] Zero proofs disables `Create Token` and `Reset Proofs`.
- [ ] In-app error/success banner appears (no browser `alert`/`confirm` dialogs).
- [ ] Reset flow opens in-app confirmation dialog with cancel/confirm actions.
- [ ] Confirming reset clears quote/token inputs and updates balance/proof summary.
- [ ] Activity shows structured entries (timestamp, severity, title).
- [ ] Long payload entries can be expanded and copied.

## Mobile/Narrow Viewport Checklist
- [ ] Stage headers stack cleanly and remain readable.
- [ ] Action buttons wrap without overlap.
- [ ] Input fields and textareas remain fully visible and usable.
- [ ] Activity entries remain scannable with severity and timestamp visible.

## Expected API/State Outcomes During Lifecycle
- [ ] connect -> quote create/check/mint -> send -> receive -> reset executes without stale UI fields.
- [ ] After reset: `balance=0`, `proofs=0`, quote/token transient fields are cleared.
