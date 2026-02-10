import { redactNwcUriSecret, tryParseNwcUri } from '@lib/payments/nwcUri';

describe('nwcUri', () => {
  describe('tryParseNwcUri', () => {
    it('parses a valid nostr+walletconnect URI', () => {
      // Avoid 64-char hex literals to prevent false positives in secret scanners.
      const pubkey = 'test-wallet-service-pubkey';
      const uri =
        `nostr+walletconnect://${pubkey}?relay=wss://relay.one&relay=wss://relay.two&secret=deadbeef`;

      const parsed = tryParseNwcUri(uri);
      expect(parsed).toEqual({
        pubkey,
        relays: ['wss://relay.one', 'wss://relay.two'],
        secret: 'deadbeef',
        uri,
      });
    });

    it('returns null when required fields are missing', () => {
      expect(tryParseNwcUri('')).toBeNull();
      expect(tryParseNwcUri('nostr+walletconnect://pubkey?secret=abc')).toBeNull();
      expect(tryParseNwcUri('nostr+walletconnect://pubkey?relay=wss://r')).toBeNull();
    });
  });

  describe('redactNwcUriSecret', () => {
    it('redacts the secret when URI is parseable', () => {
      const uri =
        'nostr+walletconnect://pubkey?relay=wss://relay.one&secret=supersecret';
      expect(redactNwcUriSecret(uri)).toContain('secret=***');
      expect(redactNwcUriSecret(uri)).not.toContain('supersecret');
    });

    it('returns input when not parseable', () => {
      expect(redactNwcUriSecret('not a url')).toBe('not a url');
    });
  });
});
