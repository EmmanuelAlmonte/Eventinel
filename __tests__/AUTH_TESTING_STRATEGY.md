# Authentication Testing Strategy for Eventinel Mobile

## Executive Summary

This document outlines a comprehensive testing strategy for the authentication implementation in Eventinel Mobile. The strategy balances thoroughness with practicality, focusing on tests that provide the most value for auth reliability.

## Test Infrastructure Overview

### Dependencies Installed

```json
{
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^12.9.0",
    "jest": "^29.7.0",
    "jest-expo": "^53.0.5",
    "react-native-gesture-handler": "^2.21.0",
    "react-test-renderer": "19.0.0"
  }
}
```

### Test Scripts

```bash
npm test              # Run all tests
npm run test:watch    # Run in watch mode
npm run test:coverage # Generate coverage report
npm run test:auth     # Run only auth-related tests
```

## Files Created

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration for Expo/React Native |
| `jest.setup.js` | Global mocks and test setup |
| `__mocks__/@nostr-dev-kit/mobile.ts` | Comprehensive NDK mock |
| `__mocks__/react-native-get-random-values.js` | Crypto polyfill mock |
| `__mocks__/expo-secure-store.js` | SecureStore mock |
| `__mocks__/expo-sqlite.js` | SQLite mock |
| `__mocks__/expo-nip55.js` | NIP-55 module mock |
| `__tests__/screens/LoginScreen.test.tsx` | LoginScreen unit tests |
| `__tests__/screens/ProfileScreen.test.tsx` | ProfileScreen unit tests |
| `__tests__/App.test.tsx` | App auth guard tests |
| `__tests__/auth/signers.test.ts` | Signer class tests |
| `__tests__/auth/auth-flow.integration.test.ts` | Integration tests |

## What Can Be Tested

### Fully Testable (Unit Tests)

1. **Component Rendering**
   - LoginScreen displays correct sections based on platform
   - ProfileScreen shows user information
   - Error messages display correctly
   - Loading states show/hide appropriately

2. **Form Validation**
   - Empty bunker URL shows error
   - Empty private key shows error
   - Input trimming works correctly

3. **Auth Guard Logic**
   - App shows LoginScreen when `currentUser` is null
   - App shows main navigation when user is authenticated

4. **Logout Flow**
   - Confirmation dialog appears
   - Logout is called with correct pubkey
   - Cancel does not trigger logout

5. **Error Handling**
   - Signer creation errors display to user
   - Connection errors are caught and shown
   - Non-Error exceptions handled gracefully

### Testable with Mocks (Integration Tests)

1. **Login Flow Simulation**
   - NIP-55 signer creation and login
   - NIP-46 bunker connection flow
   - Private key signer flow

2. **Session State Management**
   - User state transitions (login/logout)
   - Pubkey tracking

3. **NDK Hook Behavior**
   - useNDKSessionLogin called correctly
   - useNDKSessionLogout called with pubkey
   - useSessionMonitor initialized

### Cannot Be Tested (Require E2E/Manual)

1. **Real NIP-55 Interaction**
   - Actual Amber app communication
   - Android Intent handling
   - User approval in signer app

2. **Real NIP-46 Bunker**
   - WebSocket connection to bunker
   - Cryptographic handshake
   - Remote signing

3. **SecureStore Persistence**
   - Actual encrypted storage
   - Session restoration on app restart

4. **Native Module Behavior**
   - expo-nip55 native calls
   - expo-secure-store encryption

## Test Coverage Targets

| Component | Coverage Target | Priority |
|-----------|-----------------|----------|
| LoginScreen.tsx | 70% | Critical |
| ProfileScreen.tsx | 75% | High |
| App.tsx (auth guard) | 80% | Critical |
| Signer mocks | 90% | High |
| Auth flow integration | 85% | High |

## Mocking Strategy

### NDK Hooks Mock (`__mocks__/@nostr-dev-kit/mobile.ts`)

The mock provides controllable state for all NDK hooks:

```typescript
// In test setup:
import { mockNDKHooks } from '../__mocks__/@nostr-dev-kit/mobile';

// Set authenticated state
mockNDKHooks.setCurrentUser({
  pubkey: 'abc123',
  profile: { displayName: 'Test User' }
});

// Set NIP-55 availability
mockNDKHooks.setNip55Available(true);
mockNDKHooks.setNip55Apps([
  { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' }
]);

// Reset between tests
mockNDKHooks.reset();
```

### Signer Class Mocks

Mock signers simulate real behavior:

- `NDKPrivateKeySigner`: Validates key length, generates consistent pubkeys
- `NDKNip55Signer`: Checks against available apps list
- `NDKNip46Signer`: Validates bunker URL format

### Platform Mock

```javascript
// In tests:
Platform.OS = 'android'; // or 'ios'
```

## Test Execution

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Specific file
npm test -- LoginScreen

# Auth tests only
npm run test:auth

# Watch mode
npm run test:watch
```

### Expected Output

```
PASS  __tests__/screens/LoginScreen.test.tsx
PASS  __tests__/screens/ProfileScreen.test.tsx
PASS  __tests__/App.test.tsx
PASS  __tests__/auth/signers.test.ts
PASS  __tests__/auth/auth-flow.integration.test.ts

Test Suites: 5 passed, 5 total
Tests:       ~80 passed, ~80 total
Coverage:    ~75% statements
```

## Future Enhancements

### E2E Testing with Detox

For true end-to-end authentication testing:

```bash
# Install Detox
npm install -D detox @types/detox

# Create e2e tests
e2e/
  auth.e2e.ts
  login-nip55.e2e.ts
  login-bunker.e2e.ts
  logout.e2e.ts
```

### Manual Testing Checklist

For features that cannot be automated:

- [ ] NIP-55 login with real Amber app
- [ ] NIP-46 login with real bunker
- [ ] Session persistence across app restart
- [ ] Biometric authentication (if added)
- [ ] Deep link handling for bunker URLs

## Appendix: Key Test Scenarios

### LoginScreen Test Matrix

| Scenario | Platform | Expected |
|----------|----------|----------|
| NIP-55 section shown | Android + apps available | Visible |
| NIP-55 section hidden | Android + no apps | Hidden |
| NIP-55 section hidden | iOS | Hidden |
| Bunker recommended | iOS | Primary button |
| Bunker optional | Android | Secondary button |
| Empty key error | Both | Shows error |
| Loading state | Both | Shows spinner |

### ProfileScreen Test Matrix

| Scenario | Expected |
|----------|----------|
| User with displayName | Shows displayName |
| User with only name | Shows name |
| User with no name | Shows "Anonymous" |
| User with bio | Shows bio |
| User without bio | Bio section hidden |
| Logout pressed | Shows confirmation |
| Logout confirmed | Calls logout(pubkey) |
| Logout cancelled | No action |

### Auth Guard Test Matrix

| currentUser | Expected Screen |
|-------------|-----------------|
| null | LoginScreen |
| { pubkey: '...' } | Main Navigation |
