# Git Hooks

This directory contains git hooks that protect against committing secrets.

## Installation

**After cloning the repo (or on a new machine):**

```bash
cd Eventinel-mobile
bash scripts/install-git-hooks.sh
```

## What's Protected

The `pre-commit` hook prevents committing:

### Sensitive Files
- `.env` (environment variables)
- `.env.local`
- `*.key`, `*.pem` (private keys)
- `*.p12`, `*.mobileprovision` (iOS certificates)
- `google-services.json`, `GoogleService-Info.plist` (Firebase)

### Secret Patterns in Code
- **Mapbox tokens**: `pk.xxx`, `sk.xxx`, `tk.xxx`
- **Nostr private keys**: `nsec1...` or hex keys
- **AWS keys**: `AKIA...`
- **API keys**: `api_key=`, `API_KEY=`
- **Auth tokens**: `auth_token=`, `AUTH_TOKEN=`
- **Private keys**: PEM-encoded RSA/EC keys

## Bypass (Emergency Only)

```bash
# Only if you're 100% sure the file is safe
git commit --no-verify -m "your message"
```

## How It Works

```bash
# Blocked: .env file
git add .env
git commit -m "add config"
🔍 Checking for sensitive files and secrets...
❌ ERROR: Attempting to commit sensitive file(s): .env
...

# Allowed: .env.example with placeholders
git add .env.example
git commit -m "add template"
🔍 Checking for sensitive files and secrets...
✅ .env.example appears safe (no real secrets detected)
✅ Pre-commit checks passed
```

The commit is blocked before it reaches the repo.

## Updating Hooks

If you modify the hooks:

1. Edit `scripts/pre-commit`
2. Run `bash scripts/install-git-hooks.sh` to update `.git/hooks/`
3. Commit the updated `scripts/pre-commit` to version control

## Cashu Local Mint Scripts

For local Cashu transaction testing, use:

```bash
npm run cashu:mint:up
npm run cashu:mint:status
npm run cashu:mint:logs
npm run cashu:mint:down
npm run cashu:cli:help
npm run cashu:cli:info
npm run cashu:cli:wallets
npm run cashu:cli:balance
npm run cashu:cli:smoke
npm run cashu:web:wallet
```

Backed by:
- `scripts/cashu/docker-compose.nutshell.yml`
- `scripts/cashu/start-local-mint.ps1`
- `scripts/cashu/stop-local-mint.ps1`
- `scripts/cashu/logs-local-mint.ps1`
- `scripts/cashu/status-local-mint.ps1`
- `scripts/cashu/cashu-cli.ps1`
- `scripts/cashu/cashu-cli-smoke.ps1`
- `scripts/cashu/mini-wallet-server.mjs`
- `scripts/cashu/mini-wallet/index.html`
