# NDK Package Alias (Retired)

## Status

The NDK package name has migrated back to `@nostr-dev-kit/mobile`. The legacy
alias that mapped `@nostr-dev-kit/mobile` → `@nostr-dev-kit/ndk-mobile` has been
removed from this repo.

## Current Setup

- The app installs and imports `@nostr-dev-kit/mobile` directly.
- There are **no** tsconfig path aliases or Metro aliases for NDK.

## Historical Context (Why this file exists)

This repo previously used `@nostr-dev-kit/ndk-mobile` and kept a tsconfig/Metro
alias so the codebase could keep importing `@nostr-dev-kit/mobile`. That alias
is no longer needed now that the official package is back to the `mobile` name.

## If you ever need the alias again

1) Install the legacy package:
```bash
npm install @nostr-dev-kit/ndk-mobile
```

2) Add a tsconfig path alias:
```json
"@nostr-dev-kit/mobile": ["node_modules/@nostr-dev-kit/ndk-mobile"],
"@nostr-dev-kit/mobile/*": ["node_modules/@nostr-dev-kit/ndk-mobile/*"]
```

3) Add a Metro alias:
```js
config.resolver.extraNodeModules = {
  '@nostr-dev-kit/mobile': path.resolve(__dirname, 'node_modules/@nostr-dev-kit/ndk-mobile'),
};
```

4) Clear Metro cache:
```bash
npx expo start --clear
```

## Notes

Using the alias will override normal node_modules resolution. Only re‑enable it
if you intentionally want to use `@nostr-dev-kit/ndk-mobile`.
