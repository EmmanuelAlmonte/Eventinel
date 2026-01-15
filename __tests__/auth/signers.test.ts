/**
 * NDK Signer Tests
 *
 * Tests the mock signer implementations to ensure they behave
 * correctly for integration testing. These tests validate that
 * our mocks accurately simulate the real signer behavior.
 *
 * Note: These test the MOCKS, not the real signers.
 * Real signer testing requires device/platform-specific E2E tests.
 */

import {
  NDKPrivateKeySigner,
  NDKNip55Signer,
  NDKNip46Signer,
  mockNDKHooks,
} from '../../__mocks__/@nostr-dev-kit/mobile';

// =============================================================================
// NDKPrivateKeySigner Tests
// =============================================================================

describe('NDKPrivateKeySigner (Mock)', () => {
  describe('Construction', () => {
    it('accepts valid hex private key', () => {
      const key = 'a'.repeat(64);
      expect(() => new NDKPrivateKeySigner(key)).not.toThrow();
    });

    it('throws for empty key', () => {
      expect(() => new NDKPrivateKeySigner('')).toThrow('Invalid private key');
    });

    it('throws for key shorter than 32 characters', () => {
      expect(() => new NDKPrivateKeySigner('short')).toThrow('Invalid private key');
    });

    it('accepts nsec format key', () => {
      // nsec keys are typically longer due to bech32 encoding
      const nsecKey = 'nsec1' + 'a'.repeat(58);
      expect(() => new NDKPrivateKeySigner(nsecKey)).not.toThrow();
    });
  });

  describe('user() method', () => {
    it('returns user object with pubkey', async () => {
      const key = 'a'.repeat(64);
      const signer = new NDKPrivateKeySigner(key);

      const user = await signer.user();

      expect(user).toBeDefined();
      expect(user.pubkey).toBeDefined();
      expect(user.pubkey.startsWith('pubkey_')).toBe(true);
    });

    it('returns consistent pubkey for same key', async () => {
      const key = 'b'.repeat(64);
      const signer1 = new NDKPrivateKeySigner(key);
      const signer2 = new NDKPrivateKeySigner(key);

      const user1 = await signer1.user();
      const user2 = await signer2.user();

      expect(user1.pubkey).toBe(user2.pubkey);
    });

    it('returns different pubkey for different keys', async () => {
      const signer1 = new NDKPrivateKeySigner('a'.repeat(64));
      const signer2 = new NDKPrivateKeySigner('b'.repeat(64));

      const user1 = await signer1.user();
      const user2 = await signer2.user();

      expect(user1.pubkey).not.toBe(user2.pubkey);
    });

    it('includes profile in returned user', async () => {
      const signer = new NDKPrivateKeySigner('c'.repeat(64));
      const user = await signer.user();

      expect(user.profile).toBeDefined();
      expect(user.profile.displayName).toBe('Private Key User');
    });
  });

  describe('sign() method', () => {
    it('returns event with signature', async () => {
      const signer = new NDKPrivateKeySigner('d'.repeat(64));
      const event = { id: 'test', content: 'hello' };

      const signed = await signer.sign(event);

      expect(signed.sig).toBeDefined();
      expect(signed.sig.startsWith('mock_signature_')).toBe(true);
    });

    it('preserves original event properties', async () => {
      const signer = new NDKPrivateKeySigner('e'.repeat(64));
      const event = { id: 'test-id', content: 'test content', kind: 1 };

      const signed = await signer.sign(event);

      expect(signed.id).toBe('test-id');
      expect(signed.content).toBe('test content');
      expect(signed.kind).toBe(1);
    });
  });

  describe('blockUntilReady() method', () => {
    it('resolves with self', async () => {
      const signer = new NDKPrivateKeySigner('f'.repeat(64));
      const result = await signer.blockUntilReady();
      expect(result).toBe(signer);
    });
  });
});

// =============================================================================
// NDKNip55Signer Tests
// =============================================================================

describe('NDKNip55Signer (Mock)', () => {
  beforeEach(() => {
    mockNDKHooks.reset();
    mockNDKHooks.setNip55Apps([
      { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
      { packageName: 'com.example.signer', name: 'Example Signer' },
    ]);
  });

  describe('Construction', () => {
    it('accepts valid package name', () => {
      expect(
        () => new NDKNip55Signer('com.greenart7c3.nostrsigner')
      ).not.toThrow();
    });

    it('accepts package name not in apps list', () => {
      // Construction succeeds, but blockUntilReady will fail
      expect(() => new NDKNip55Signer('com.unknown.app')).not.toThrow();
    });
  });

  describe('blockUntilReady() method', () => {
    it('resolves for available signer app', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await expect(signer.blockUntilReady()).resolves.toBe(signer);
    });

    it('rejects for unavailable signer app', async () => {
      const signer = new NDKNip55Signer('com.unknown.app');
      await expect(signer.blockUntilReady()).rejects.toThrow('not available');
    });

    it('rejects when no NIP-55 apps are available', async () => {
      mockNDKHooks.setNip55Apps([]);
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await expect(signer.blockUntilReady()).rejects.toThrow('not available');
    });
  });

  describe('user() method', () => {
    it('returns user after blockUntilReady', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await signer.blockUntilReady();

      const user = await signer.user();

      expect(user).toBeDefined();
      expect(user.pubkey).toBeDefined();
      expect(user.pubkey.includes('nip55_pubkey')).toBe(true);
    });

    it('throws if called before blockUntilReady', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await expect(signer.user()).rejects.toThrow('not ready');
    });

    it('includes profile in returned user', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await signer.blockUntilReady();

      const user = await signer.user();

      expect(user.profile.displayName).toBe('NIP-55 User');
    });
  });

  describe('sign() method', () => {
    it('signs event after blockUntilReady', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      await signer.blockUntilReady();

      const event = { id: 'test', content: 'hello' };
      const signed = await signer.sign(event);

      expect(signed.sig).toBeDefined();
      expect(signed.sig.startsWith('nip55_signature_')).toBe(true);
    });

    it('throws if called before blockUntilReady', async () => {
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');
      const event = { id: 'test', content: 'hello' };

      await expect(signer.sign(event)).rejects.toThrow('not ready');
    });
  });
});

// =============================================================================
// NDKNip46Signer Tests
// =============================================================================

describe('NDKNip46Signer (Mock)', () => {
  const mockNDK = { pool: { on: jest.fn() } };

  describe('Construction', () => {
    it('accepts valid bunker URL', () => {
      expect(
        () => new NDKNip46Signer(mockNDK, 'bunker://abc123?relay=wss://relay.test.com')
      ).not.toThrow();
    });

    it('accepts bunker URL without relay param', () => {
      expect(
        () => new NDKNip46Signer(mockNDK, 'bunker://abc123')
      ).not.toThrow();
    });
  });

  describe('blockUntilReady() method', () => {
    it('resolves for valid bunker URL', async () => {
      const signer = new NDKNip46Signer(
        mockNDK,
        'bunker://abc123?relay=wss://relay.test.com'
      );
      await expect(signer.blockUntilReady()).resolves.toBe(signer);
    });

    it('rejects for invalid bunker URL format', async () => {
      const signer = new NDKNip46Signer(mockNDK, 'invalid://url');
      await expect(signer.blockUntilReady()).rejects.toThrow('Invalid bunker URL');
    });

    it('rejects for bunker URL containing "fail"', async () => {
      // Special test behavior
      const signer = new NDKNip46Signer(mockNDK, 'bunker://fail?relay=wss://test.com');
      await expect(signer.blockUntilReady()).rejects.toThrow('connection failed');
    });
  });

  describe('user() method', () => {
    it('returns user after blockUntilReady', async () => {
      const signer = new NDKNip46Signer(
        mockNDK,
        'bunker://abc123def456?relay=wss://relay.test.com'
      );
      await signer.blockUntilReady();

      const user = await signer.user();

      expect(user).toBeDefined();
      expect(user.pubkey).toBeDefined();
    });

    it('extracts pubkey from bunker URL', async () => {
      const signer = new NDKNip46Signer(
        mockNDK,
        'bunker://abc123def456?relay=wss://relay.test.com'
      );
      await signer.blockUntilReady();

      const user = await signer.user();

      expect(user.pubkey).toBe('abc123def456');
    });

    it('throws if called before blockUntilReady', async () => {
      const signer = new NDKNip46Signer(mockNDK, 'bunker://abc123');
      await expect(signer.user()).rejects.toThrow('not ready');
    });

    it('includes profile in returned user', async () => {
      const signer = new NDKNip46Signer(mockNDK, 'bunker://abc123');
      await signer.blockUntilReady();

      const user = await signer.user();

      expect(user.profile.displayName).toBe('Bunker User');
    });
  });

  describe('sign() method', () => {
    it('signs event after blockUntilReady', async () => {
      const signer = new NDKNip46Signer(mockNDK, 'bunker://abc123');
      await signer.blockUntilReady();

      const event = { id: 'test', content: 'hello' };
      const signed = await signer.sign(event);

      expect(signed.sig).toBeDefined();
      expect(signed.sig.startsWith('nip46_signature_')).toBe(true);
    });

    it('throws if called before blockUntilReady', async () => {
      const signer = new NDKNip46Signer(mockNDK, 'bunker://abc123');
      const event = { id: 'test', content: 'hello' };

      await expect(signer.sign(event)).rejects.toThrow('not ready');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Signer Integration', () => {
  describe('Login flow simulation', () => {
    it('simulates NIP-55 login flow', async () => {
      mockNDKHooks.setNip55Apps([
        { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
      ]);

      // 1. Create signer
      const signer = new NDKNip55Signer('com.greenart7c3.nostrsigner');

      // 2. Wait for signer to be ready
      await signer.blockUntilReady();

      // 3. Get user (this would set the current user in real app)
      const user = await signer.user();

      expect(user.pubkey).toBeDefined();
    });

    it('simulates NIP-46 bunker login flow', async () => {
      const mockNDK = { pool: { on: jest.fn() } };
      const bunkerUrl = 'bunker://abc123?relay=wss://relay.test.com';

      // 1. Create signer
      const signer = new NDKNip46Signer(mockNDK, bunkerUrl);

      // 2. Wait for bunker connection
      await signer.blockUntilReady();

      // 3. Get user
      const user = await signer.user();

      expect(user.pubkey).toBe('abc123');
    });

    it('simulates manual key login flow', async () => {
      const privateKey = 'a'.repeat(64);

      // 1. Create signer
      const signer = new NDKPrivateKeySigner(privateKey);

      // 2. Get user (no blockUntilReady needed for private key)
      const user = await signer.user();

      expect(user.pubkey).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('handles NIP-55 unavailable app gracefully', async () => {
      mockNDKHooks.setNip55Apps([]);

      const signer = new NDKNip55Signer('com.unknown.app');

      try {
        await signer.blockUntilReady();
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('not available');
      }
    });

    it('handles invalid bunker connection', async () => {
      const mockNDK = { pool: { on: jest.fn() } };
      const signer = new NDKNip46Signer(mockNDK, 'bunker://fail');

      try {
        await signer.blockUntilReady();
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('connection failed');
      }
    });

    it('handles invalid private key', () => {
      expect(() => new NDKPrivateKeySigner('invalid')).toThrow();
    });
  });
});
