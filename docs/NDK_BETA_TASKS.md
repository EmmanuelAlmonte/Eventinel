# NDK Beta Adoption Task List

- Verify no runtime aliasing remains
- Confirm `@nostr-dev-kit/ndk-mobile` is absent from code, tsconfig, Metro.

- Enable AI Guardrails in dev
- Add `aiGuardrails: __DEV__` (or config) to `lib/ndk.ts` NDK init.

- Add future timestamp protection
- Add `futureTimestampGrace` to NDK init in `lib/ndk.ts` (e.g., 600s).

- NIP-46 flow upgrades
- Add `nostrconnect://` login path (or explicit `NDKNip46Signer.nostrconnect` / `.bunker` usage) in `screens/LoginScreen.tsx`.
- Add UX note or fallback for NIP-04-only bunkers if needed.

- Replace manual profile fetch in comments
- Refactor `hooks/useIncidentComments.ts` to use `useProfile`/`useProfileValue`/`useUser` from `@nostr-dev-kit/mobile`.

- Re-test cache workaround
- Verify if tag-based cache queries are fixed; remove `cacheUnconstrainFilter` + `groupable: false` in `hooks/useIncidentSubscription.ts` if no longer needed.

- Optional: relay provenance enforcement
- Add `exclusiveRelay: true` in incident subscriptions to limit results to saved relays.

- Optional: relay list publishing
- Use `NDKRelayFeedList` to persist/sync relay lists in `screens/RelayConnectScreen.tsx` and `lib/relay/*`.
