# Build/Package Fixes (Eventinel Mobile)

Date: 2026-01-29  
Project: Eventinel Mobile (`E:\MASTER\EmmaWorkShop\NOSTR\Eventinel-mobile`)

This document records build/package fixes and Metro patches applied for the
Eventinel Mobile repo.

---

## 1) NDK Mobile migration to beta package

**Problem**
- The NDK mobile package was migrated back to `@nostr-dev-kit/mobile` and the
  beta line provides the latest mobile features.
- The previous setup used `@nostr-dev-kit/ndk-mobile` with tsconfig + Metro
  aliases, which became outdated.

**Fix**
- Switched to the beta package:
  - `@nostr-dev-kit/mobile@0.9.3-beta.70`
- Added required peer dependencies pulled by `@nostr-dev-kit/wallet`:
  - `@nostr-dev-kit/ndk@^3.0.0-beta.70`
  - `@nostr-dev-kit/sync@^1.0.0-beta.70`
- Removed the alias indirection:
  - Removed tsconfig `paths` entries for `@nostr-dev-kit/mobile` -> `ndk-mobile`
  - Removed the Metro extraNodeModules alias

**Files updated**
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `metro.config.js`
- Docs/templates/comments referencing old `ndk-mobile` wording

---

## 2) Metro bundling crash (`Chunk containing module not found: undefined`)

**Symptom**
- Metro bundler crash during release build with:
  - `AssertionError: Chunk containing module not found: undefined`
  - Related `path.relative` errors when async dependency paths were missing

**Root cause**
Some async dependencies were optional/virtual and had no `absolutePath`.
Metro’s serializer treated those as fatal.

**Fix**
Patched `@expo/metro-config` serializer to guard missing async paths:

- Skip unresolved async deps before accessing `absolutePath`
- Use a local `dependencyPath` variable consistently
- Avoid `path.relative` if `module.path` is missing

**Files patched**
- `node_modules/@expo/metro-config/build/serializer/fork/js.js`
- `node_modules/@expo/metro-config/build/serializer/serializeChunks.js`

**Patch file**
- `patches/@expo+metro-config+0.20.14.patch`

---

## 3) `@noble/hashes/crypto.js` export warnings

**Symptom**
- Metro warnings:
  - `Attempted to import ... @noble/hashes/crypto.js ... not listed in "exports"`

**Fix**
Added a Metro resolver rewrite to use the exported subpath:

```
@noble/hashes/crypto.js  ->  @noble/hashes/crypto
```

**File updated**
- `metro.config.js`

**Note**
If warnings persist after a clean Metro cache, patch the nested
`@noble/hashes` `package.json` exports to include `"./crypto.js"` and
re‑generate patches as needed. The resolver alias should cover most cases.

---

## 4) Patch persistence

**Goal**
Ensure Metro patches survive reinstallations.

**Fix**
- Added `patch-package`
- Added `postinstall` hook:
  - `"postinstall": "patch-package"`

**Files updated**
- `package.json`
- `package-lock.json`

**Patch files**
- `patches/@expo+metro-config+0.20.14.patch`

---

## 5) Verification steps

Recommended validation flow:

```
# Clean Metro cache
npx expo start -c

# Release build
npx expo run:android --variant release
```

---

## 6) Notes & warnings

- `Bundler cache is empty, rebuilding` is normal after clearing cache.
- NDK beta packages can introduce new peer dependencies; keep `@nostr-dev-kit/ndk`
  and `@nostr-dev-kit/sync` aligned with the mobile beta line.

---

End of document.
