# NDK Package Alias Workaround

## Background

The NDK mobile package was renamed from `@nostr-dev-kit/mobile` to `@nostr-dev-kit/ndk-mobile`. Rather than updating all imports throughout the codebase, we use a tsconfig path alias to redirect the old name to the new package.

## Current Setup

In `tsconfig.json`, these aliases redirect imports:

```json
"@nostr-dev-kit/mobile": ["node_modules/@nostr-dev-kit/ndk-mobile"],
"@nostr-dev-kit/mobile/*": ["node_modules/@nostr-dev-kit/ndk-mobile/*"],
```

This allows code to import from `@nostr-dev-kit/mobile` while actually resolving to `@nostr-dev-kit/ndk-mobile`.

## When to Remove

Remove the alias when **either**:
1. The package is renamed back to `@nostr-dev-kit/mobile`
2. You decide to update all imports to use `@nostr-dev-kit/ndk-mobile` directly

## How to Remove

1. Install the new package (if applicable):
   ```bash
   npm install @nostr-dev-kit/mobile
   ```

2. Edit `tsconfig.json` and delete these lines:
   ```json
   "@nostr-dev-kit/mobile": ["node_modules/@nostr-dev-kit/ndk-mobile"],
   "@nostr-dev-kit/mobile/*": ["node_modules/@nostr-dev-kit/ndk-mobile/*"],
   ```

3. Clear Metro cache and restart:
   ```bash
   npx expo start --clear
   ```

## Notes

- tsconfig paths take precedence over node_modules resolution
- If the real `@nostr-dev-kit/mobile` package is installed without removing the alias, the alias will still redirect to `ndk-mobile`
