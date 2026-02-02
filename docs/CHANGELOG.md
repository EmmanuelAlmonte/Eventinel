# Changelog

All notable changes to Eventinel Mobile will be documented in this file.
4e39c75d6da36db3ce439e058cfacd0db36d6550
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING: Migrated NDK package** from `@nostr-dev-kit/ndk-mobile@0.8.43` to `@nostr-dev-kit/mobile@0.9.3-beta.70`
  - Package renamed: `ndk-mobile` → `mobile`
  - All dependencies now aligned to `3.0.0-beta.70` (eliminates version conflicts)
  - Updated all imports across 14 files

- **Fixed NDK initialization pattern** in `App.tsx`
  - Replaced manual `useNDKStore.getState().setNDK(ndk)` with proper `useNDKInit()` hook
  - `useNDKInit()` initializes all 4 required stores: NDK, sessions, profiles, mutes
  - Fixes: "NDK instance not initialized in session store" error

- **Fixed pool event listeners** in `lib/ndk.ts`
  - Removed invalid events: `relay:error`, `relay:eose` (don't exist in NDK)
  - Fixed `relay:notice` → `notice` (correct event name)
  - Added valid events: `relay:authed`, `flapping`

- **Fixed implicit any type** in `lib/nostr/config.ts`
  - Added type annotation to map callback parameter

- **Updated NIP-46 signer instantiation** in `screens/LoginScreen.tsx`
  - Changed from `new NDKNip46Signer(ndk, url)` to `NDKNip46Signer.bunker(ndk, url)`
  - Follows recommended static factory method pattern from NDK source

### Removed

- **Removed web-only code** from `lib/nostr/client.ts`
  - Removed `@nostr-dev-kit/cache-dexie` import (IndexedDB, web-only)
  - Removed `isBrowser()` checks
  - Removed `createDexieCache()` function
  - Mobile apps should use `NDKCacheAdapterSqlite` from `lib/ndk.ts`

### Technical Details

#### NDK Package Migration

| Before | After |
|--------|-------|
| `@nostr-dev-kit/ndk-mobile@0.8.43` | `@nostr-dev-kit/mobile@0.9.3-beta.70` |
| `ndk@2.15.2` + `ndk@2.18.1` (conflict) | `ndk@3.0.0-beta.70` (unified) |

#### Files Modified

- `package.json` - Updated dependency
- `App.tsx` - Fixed initialization pattern
- `lib/ndk.ts` - Fixed pool event names
- `lib/nostr/client.ts` - Removed web-only code
- `lib/nostr/config.ts` - Fixed TypeScript error
- `screens/LoginScreen.tsx` - Updated signer pattern
- `screens/ProfileScreen.tsx` - Updated import path
- `screens/MapScreen.tsx` - Updated import path
- `screens/MenuScreen.tsx` - Updated import path
- `screens/RelayConnectScreen.tsx` - Updated import path
- `lib/nostr/events/types.ts` - Updated import path
- `lib/nostr/events/incident.ts` - Updated import path
- `lib/nostr/index.ts` - Updated import path
- `lib/relay/status.ts` - Updated import path
- `types/relay.ts` - Updated import path
- `lib/nostr/__tests__/events/incident.test.ts` - Updated import path

#### Why useNDKInit() Instead of Manual setNDK()

The `useNDKInit()` hook initializes 4 Zustand stores, not just 1:

```typescript
// What useNDKInit() does internally:
setNDK(ndkInstance);              // NDK store
initializeProfilesStore(ndkInstance);  // Profiles store
initializeSessionStore(ndkInstance);   // Sessions store (was missing!)
initializeMutesStore(ndkInstance);     // Mutes store
```

Manual `useNDKStore.getState().setNDK(ndk)` only initialized the NDK store, leaving the sessions store uninitialized, which caused login failures.

#### Valid NDK Pool Events

From `@nostr-dev-kit/ndk/src/relay/pool/index.ts`:

| Event | Signature |
|-------|-----------|
| `notice` | `(relay: NDKRelay, notice: string) => void` |
| `flapping` | `(relay: NDKRelay) => void` |
| `connect` | `() => void` |
| `relay:connecting` | `(relay: NDKRelay) => void` |
| `relay:connect` | `(relay: NDKRelay) => void` |
| `relay:ready` | `(relay: NDKRelay) => void` |
| `relay:disconnect` | `(relay: NDKRelay) => void` |
| `relay:auth` | `(relay: NDKRelay, challenge: string) => void` |
| `relay:authed` | `(relay: NDKRelay) => void` |

**Invalid events (removed):** `relay:error`, `relay:notice`, `relay:eose`
