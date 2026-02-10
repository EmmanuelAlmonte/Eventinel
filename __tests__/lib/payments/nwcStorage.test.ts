import * as SecureStore from 'expo-secure-store';

import { clearNwcPairingCode, loadNwcPairingCode, saveNwcPairingCode } from '@lib/payments/nwcStorage';

describe('nwcStorage', () => {
  beforeEach(() => {
    // @ts-expect-error - test-only helper from __mocks__/expo-secure-store.js
    SecureStore.__clear?.();
  });

  it('returns null when no pairing code is stored', async () => {
    await expect(loadNwcPairingCode()).resolves.toBeNull();
  });

  it('saves and loads pairing code', async () => {
    await saveNwcPairingCode('nostr+walletconnect://example');
    await expect(loadNwcPairingCode()).resolves.toBe('nostr+walletconnect://example');
  });

  it('clears pairing code', async () => {
    await saveNwcPairingCode('nostr+walletconnect://example');
    await clearNwcPairingCode();
    await expect(loadNwcPairingCode()).resolves.toBeNull();
  });
});

