# Metro Release Build Fixes Attempted

**Issue**: Release builds fail with `AssertionError [ERR_ASSERTION]: Chunk containing module not found: undefined`

**Root Cause**: `@noble/hashes` package exports `./crypto` but NDK packages import `./crypto.js`. Metro's package exports resolution handles this in dev mode (fallback) but fails in release mode during chunking.

---

## Fix 1: Disable Package Exports Entirely

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

module.exports = config;
```

**Result**: ❌ Failed - Broke `nostr-tools/nip49` subpath imports which require package exports to resolve.

---

## Fix 2: Custom Resolver for @noble/hashes Only

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js') {
    return context.resolveRequest(context, '@noble/hashes/crypto', platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

**Result**: ❌ Failed - Resolver didn't catch nested imports from `@nostr-dev-kit/ndk/node_modules/@noble/hashes`. The warnings showed full file paths, not module specifiers.

---

## Fix 3: Disable Exports + extraNodeModules Mapping

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

config.resolver.extraNodeModules = {
  'nostr-tools/nip49': path.resolve(__dirname, 'node_modules/nostr-tools/lib/esm/nip49.js'),
  'nostr-tools/nip19': path.resolve(__dirname, 'node_modules/nostr-tools/lib/esm/nip19.js'),
  'nostr-tools/nip04': path.resolve(__dirname, 'node_modules/nostr-tools/lib/esm/nip04.js'),
  // ... more mappings
};

module.exports = config;
```

**Result**: ❌ Failed - `extraNodeModules` doesn't work for subpath imports like `nostr-tools/nip49`.

---

## Fix 4: Disable Exports + Custom resolveRequest for nostr-tools

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle nostr-tools/nipXX subpath imports
  if (moduleName.startsWith('nostr-tools/')) {
    const subpath = moduleName.replace('nostr-tools/', '');
    const esmPath = path.resolve(__dirname, `node_modules/nostr-tools/lib/esm/${subpath}.js`);
    const cjsPath = path.resolve(__dirname, `node_modules/nostr-tools/lib/cjs/${subpath}.js`);

    if (fs.existsSync(esmPath)) {
      return { filePath: esmPath, type: 'sourceFile' };
    }
    if (fs.existsSync(cjsPath)) {
      return { filePath: cjsPath, type: 'sourceFile' };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

**Result**: 🔄 Testing...

---

## Other Potential Fixes (Not Yet Tried)

### Fix 5: patch-package to fix imports at source

```bash
npm i -D patch-package
```

Add to package.json:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

Edit files in `node_modules` that import `@noble/hashes/crypto.js` and change to `@noble/hashes/crypto`, then:

```bash
npx patch-package nostr-tools
npx patch-package @nostr-dev-kit/ndk
```

### Fix 6: Use older stable packages

Switch from:
- `@nostr-dev-kit/mobile@0.9.3-beta.70`

To:
- `@nostr-dev-kit/ndk-mobile@0.8.43`

This uses older versions of dependencies that may not have the exports issue.

### Fix 7: Dedupe @noble/hashes

Force all packages to use a single copy of @noble/hashes:

```js
// metro.config.js
config.resolver.extraNodeModules = {
  '@noble/hashes': path.resolve(__dirname, 'node_modules/@noble/hashes'),
  '@noble/curves': path.resolve(__dirname, 'node_modules/@noble/curves'),
};
```

### Fix 8: Environment variable for Metro

```powershell
$env:EXPO_USE_METRO_REQUIRE="1"
npx expo run:android --variant release
```

This changes Metro's module ID generation which may avoid the chunking issue.

---

## Package Versions Involved

```json
{
  "@nostr-dev-kit/mobile": "0.9.3-beta.70",
  "@nostr-dev-kit/ndk": "3.0.0-beta.70",
  "@nostr-dev-kit/react": "1.3.13-beta.70",
  "nostr-tools": "2.x",
  "@noble/hashes": "1.x",
  "expo": "^53.0.9",
  "react-native": "0.79.6"
}
```

---

## Related Links

- [UNPKG @noble/hashes exports](https://app.unpkg.com/@noble/hashes@1.7.0/files/package.json)
- [Reddit: Expo SDK 53 chunk containing module not found](https://www.reddit.com/r/expo/comments/1pbbpyy/expo_sdk_53_assertionerror_err_assertion_chunk/)
- [Metro Package Exports Support](https://metrobundler.dev/docs/package-exports/)
- [Expo Metro Config](https://docs.expo.dev/versions/latest/config/metro/)
