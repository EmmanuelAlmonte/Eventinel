# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Eventinel Mobile** is a React Native mobile app for Nostr-native public safety monitoring. It integrates with the Nostr protocol using custom incident events (kind:30911) to publish and consume real-time safety data.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run as web app
npm run web
```

## NDK Mobile Rules (Critical)

**Package:** `@nostr-dev-kit/ndk-mobile` (ONLY this package)

### Single Package Rule
```typescript
// ✅ ALWAYS use ndk-mobile (re-exports everything from core)
import { useNDK, NDKEvent, NDKNip55Signer } from '@nostr-dev-kit/ndk-mobile';

// ❌ NEVER import from these (causes errors)
import { ... } from '@nostr-dev-kit/ndk';      // Version conflicts
import { ... } from '@nostr-dev-kit/react';    // Web only - doesn't work
```

### Mobile-Specific Patterns
| Do | Don't |
|----|-------|
| `useSessionMonitor()` | `<NDKHeadless>` (web only) |
| `NDKNip55Signer` | `NDKNip07Signer` (browser only) |
| `await cacheAdapter.initialize()` | Use cache without init |
| NDK at module level | `new NDK()` inside component |

### Universal Rules
- `login(signer, true)` — second param is boolean, NOT options object
- Timestamps in seconds: `Math.floor(Date.now() / 1000)`
- Filters use hex pubkeys, not bech32 (npub)

**For detailed rules:** `.claude/skills/ndk-mobile/SKILL.md`

---

## Architecture

### Tech Stack
- **Framework**: React Native 0.79.2 + Expo 53
- **JavaScript Engine**: Hermes with React Native New Architecture enabled
- **Navigation**: React Navigation with Material Top Tabs
- **Nostr Integration**: @nostr-dev-kit/ndk-mobile
- **Storage**: expo-sqlite for NDK caching, expo-secure-store for sensitive data
- **Language**: TypeScript with strict mode

### Project Structure

```
├── App.tsx                  # Root component with NDK initialization
├── index.ts                 # Expo entry point
├── screens/                 # Screen components (Home, Map, Profile)
├── lib/
│   ├── nostr/              # Nostr protocol integration (@eventinel/nostr)
│   │   ├── client.ts       # NDK singleton and configuration
│   │   ├── config.ts       # Relay URLs, kinds, tags, constants
│   │   └── events/         # Event creation/parsing (incident.ts)
│   └── brand/              # Design tokens (@eventinel/brand)
│       ├── colors.ts       # Color system
│       ├── typography.ts   # Font styles
│       └── motion.ts       # Animation timing
```

### Critical Import Order

**IMPORTANT**: `react-native-get-random-values` MUST be the first import in App.tsx. This polyfills crypto for NDK. If you add any imports to App.tsx, ensure this remains first.

```typescript
import 'react-native-get-random-values'; // MUST be first!
```

### NDK Initialization Pattern

NDK is initialized once in App.tsx with:
- Hardcoded relay URLs (ws://10.0.0.197:8085)
- SQLite cache adapter using expo-sqlite
- NDKProvider wrapping the navigation tree
- Immediate connection on app startup

The singleton pattern in `lib/nostr/client.ts` is for web compatibility but NOT used in this mobile app. Mobile uses direct NDK initialization in App.tsx.

### Nostr Event Architecture

**Custom Event Kind**: 30911 (Parameterized Replaceable Event)

Incident events use:
- **'d' tag**: Unique incident ID (allows updates to same incident)
- **'g' tag**: Geohash for location filtering (NIP-52 standard)
- **'l' tag**: Precise geolocation as "lat,lng"
- **'type' tag**: Incident classification (fire, medical, traffic, etc.)
- **'severity' tag**: 1-5 scale
- **'source' tag**: Data source (crimeometer, radio, community, etc.)
- **JSON content**: Full incident details with metadata

See `lib/nostr/events/incident.ts` for event creation/parsing logic.

### Library Conventions

The `lib/` directory contains reusable packages structured as if they were separate npm packages:
- Each has an `index.ts` that exports a public API
- Internal implementation details are not exported
- Use absolute imports: `from '@eventinel/nostr'` (via tsconfig paths)

### Relay Security

The app currently uses public relays for development. `lib/nostr/config.ts` has logic for:
- Local development relay (wss://localhost:8443)
- Production relay (wss://relay.eventinel.com)
- Environment-based relay selection via `NEXT_PUBLIC_NOSTR_RELAYS`

However, App.tsx currently overrides this with hardcoded public relays. Be cautious about publishing test data.

## Key Patterns

### SQLite Cache Adapter

NDK is configured with `NDKCacheAdapterSqlite` from `@nostr-dev-kit/ndk-mobile`:
```typescript
cacheAdapter: new NDKCacheAdapterSqlite('eventinel.db')
```

This caches events in a local SQLite database. The database name is 'eventinel.db'.

### Navigation Structure

Uses Material Top Tabs (@react-navigation/material-top-tabs) with 3 screens:
1. **Home**: Main feed/dashboard
2. **Map**: Geographic visualization
3. **Profile**: User settings/identity

All screens are currently placeholder implementations.

### Design Tokens

Brand constants are centralized in `lib/brand/`:
- **Colors**: Primary, semantic, neutral, gradients, severity colors
- **Typography**: Font families, weights, scale, fluid type system
- **Motion**: Easing, durations, spring configs, transitions

Import via `import { BRAND } from '@eventinel/brand'` or individual exports.

### React Native New Architecture

The app uses the New Architecture (app.json: `newArchEnabled: true`). This affects:
- Native module APIs
- Turbo Modules for better performance
- Fabric renderer instead of legacy bridge

## Testing

No test infrastructure is currently set up. The only test file is:
- `lib/nostr/__tests__/events/incident.test.ts`

This suggests Jest was intended but not fully configured.

## Platform-Specific Configuration

### Android
- Gradle 8.10, Kotlin 2.0.21 (via expo-build-properties)
- Package: com.eventinel.app
- Uses adaptive icon

### iOS
- Bundle ID: com.eventinel.app
- Phone only (no tablet support)
- ITSAppUsesNonExemptEncryption: false

## Available Agents

| Agent | Use For |
|-------|---------|
| `library-api-verifier` | Verify imports exist in type definitions |
| `plan-validator` | Validate implementation plans against NDK APIs |
| `api-signature-checker` | Find exact function signatures |
| `example-finder` | Discover real-world usage patterns |

### Commands

| Command | Purpose |
|---------|---------|
| `/check-export <name>` | Verify function/type exists in package |
| `/check-export-simple <name>` | Quick export verification |

## Key Documentation Locations

- **Mobile source:** `ndk-docs/mobile/src/`
- **Mobile docs:** `ndk-docs/mobile/docs/`
- **Core (universal):** `ndk-docs/core/`
- ~~React (web):~~ `ndk-docs/react/` — NOT APPLICABLE

## Important Notes

- **No README.md exists** - this is the primary documentation
- **TypeScript strict mode** is enabled
- **EAS Project ID**: 1a58dec9-3386-4d0f-822e-48bf0ee5a852
