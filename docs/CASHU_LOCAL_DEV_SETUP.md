# Cashu Local Dev Setup (Nutshell + CDK)

This is the fastest and safest local setup for Cashu testing in Eventinel Mobile.

## Goal

Run a local Cashu mint with fake Lightning, then point the app to that mint.

Recommended order:
1. Start local Nutshell mint with FakeWallet.
2. Run Eventinel wallet smoke flow.
3. Optionally run CDK tools for deeper protocol validation.

## Prerequisites

- Docker Desktop running.
- Eventinel Mobile running in emulator/simulator/device.
- Optional CLI wallet checks: Python with `pip`.

## Quick Start (Docker Compose)

The repo now includes a ready local mint stack in `scripts/cashu/`.

1. Start mint:
```powershell
npm run cashu:mint:up
```

2. Check status:
```powershell
npm run cashu:mint:status
```

3. Follow logs:
```powershell
npm run cashu:mint:logs
```

4. Stop mint:
```powershell
npm run cashu:mint:down
```

To force a clean recreate:
```powershell
npm run cashu:mint:up:recreate
```

## Config File

On first start, the script auto-creates:
- `scripts/cashu/.env.nutshell` from `scripts/cashu/.env.nutshell.example`

Tune values there if needed:
- `MINT_HOST_BIND` defaults to `127.0.0.1` (safe loopback binding)
- `MINT_LISTEN_PORT` defaults to `3338`
- `MINT_BACKEND_BOLT11_SAT` defaults to `FakeWallet`
- `MINT_PRIVATE_KEY` is a dev key and must stay non-production

## Eventinel Wallet Mint URL Mapping

Use these mint URLs in Wallet -> Cashu:

- Android emulator: `http://10.0.0.197:3338`
- iOS simulator: `http://127.0.0.1:3338`
- Physical device: `http://<your-computer-lan-ip>:3338` (requires `MINT_HOST_BIND=0.0.0.0`)

Dev default behavior:
- Android dev builds prefill Cashu mint URL with `http://10.0.0.197:3338`.
- Optional override via `.env.local`: `EXPO_PUBLIC_CASHU_DEV_MINT_URL=<your-url>`.

## Mini Web Wallet (Recommended for single-emulator tests)

Run a simple local web wallet included in this repo:

```powershell
npm run cashu:web:wallet
```

Open:
- `http://127.0.0.1:8787`

Suggested pairing:
1. Keep mint running at `http://127.0.0.1:3338`.
2. In web wallet, use mint URL `http://127.0.0.1:3338`.
3. In Android emulator app, use mint URL `http://10.0.0.197:3338`.
4. Exchange tokens between web wallet and Android app (send/receive).

What the mini wallet supports:
- Mint URL connect + mint info
- Live mint connection badge (green = connected, red = disconnected)
- Local proof balance view
- Create/check/mint quote flow
- Send token (export)
- Receive token (import)
- Reset local proofs

## Optional CLI Smoke Test

Preferred (repo-integrated, Docker-backed):

```powershell
npm run cashu:cli:help
npm run cashu:cli:info
npm run cashu:cli:wallets
npm run cashu:cli:balance
npm run cashu:cli:smoke
```

Pass a custom mint URL (example):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cashu/cashu-cli.ps1 -MintUrl http://nutshell-dev:3338 info
```

Direct Python install (optional, may fail on Python 3.14 due `asyncpg` wheel/build issues):

```powershell
pip install cashu
$env:MINT_URL="http://127.0.0.1:3338"
cashu info
cashu balance
```

## Eventinel Smoke Flow

1. Open `Wallet` screen.
2. In Cashu section, add local mint URL.
3. Create wallet.
4. Create deposit invoice.
5. Receive a token (manual token import).
6. Refresh balance.

Primary app implementation:
- `screens/wallet/useCashuWallet.ts`

## Optional Advanced Flow (Local CDK Repos)

Use CDK after Nutshell baseline is stable:

```powershell
cd C:\Users\emman\Documents\EmmaWorkShop\cdk
cargo run --bin cdk-cli -- --help
cargo run --bin cdk-mintd
```

Notes:
- CDK is alpha in upstream docs.
- `cdk-mintd` requires `protoc`.

## Safety Defaults

- Use fake Lightning backend only (`FakeWallet`) for local testing.
- Keep mint bound to loopback unless device testing requires LAN access.
- Never reuse production keys or seed material.
- Treat all test ecash as disposable.
