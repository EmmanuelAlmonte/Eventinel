# Conventions

## Language and Style
- TypeScript strict mode
- 2-space indentation
- Prefer functional components and hooks

## Imports and NDK Rules
- Import only from @nostr-dev-kit/mobile
- Keep react-native-get-random-values as the first import in App.tsx
- Use the module-level ndk singleton from lib/ndk.ts
- Avoid web-only NDK patterns (NDKHeadless, NDKNip07Signer, localStorage)

## UI and Theming
- Use @rneui/themed components
- Pull colors from useAppTheme
- Wrap screens with ScreenContainer when applicable

## Navigation
- Bottom tabs for Map, Incidents, Profile
- Stack routes for IncidentDetail and Relays

## Testing
- Jest with jest-expo
- Prefer @testing-library/react-native for UI tests
