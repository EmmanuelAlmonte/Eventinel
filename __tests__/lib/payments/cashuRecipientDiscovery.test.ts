import { CashuRecipientDiscoveryService } from '@lib/payments/cashuRecipientDiscovery';

const RECIPIENT_PUBKEY = 'a'.repeat(64);
const RECIPIENT_P2PK = 'b'.repeat(64);

jest.mock('@lib/ndk', () => ({
  ndk: {
    getUser: jest.fn(),
  },
}));

describe('cashuRecipientDiscovery', () => {
  it('maps getZapInfo nip61 payload to found outcome with deterministic mint selection', async () => {
    const resolveZapInfo = jest.fn().mockResolvedValue(
      new Map<string, unknown>([
        [
          'nip61',
          {
            mints: ['https://mint.b', 'https://mint.a'],
            relays: ['wss://relay.eventinel.com'],
            p2pk: RECIPIENT_P2PK,
          },
        ],
      ])
    );
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo,
    });

    const outcome = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.c', 'https://mint.a', 'https://mint.b'],
    });

    expect(resolveZapInfo).toHaveBeenCalledWith(RECIPIENT_PUBKEY, 2500);
    expect(outcome.type).toBe('found');
    if (outcome.type !== 'found') return;
    expect(outcome.target.selectedMint).toBe('https://mint.a');
    expect(outcome.target.compatibleMints).toEqual(['https://mint.a', 'https://mint.b']);
    expect(outcome.target.p2pk).toBe(RECIPIENT_P2PK);
  });

  it('returns not_found when getZapInfo has no nip61 payload', async () => {
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo: jest.fn().mockResolvedValue(new Map<string, unknown>()),
    });

    const outcome = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
    });

    expect(outcome.type).toBe('not_found');
  });

  it('returns incompatible when sender mint policy has no overlap', async () => {
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo: jest.fn().mockResolvedValue(
        new Map<string, unknown>([
          [
            'nip61',
            {
              mints: ['https://mint.recipient'],
              relays: ['wss://relay.eventinel.com'],
              p2pk: RECIPIENT_P2PK,
            },
          ],
        ])
      ),
    });

    const outcome = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.sender'],
    });

    expect(outcome.type).toBe('incompatible');
    if (outcome.type !== 'incompatible') return;
    expect(outcome.senderMints).toEqual(['https://mint.sender']);
    expect(outcome.recipientMints).toEqual(['https://mint.recipient']);
  });

  it('returns invalid for malformed nip61 payload and ambiguous only when policy requires a single mint', async () => {
    const malformedService = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo: jest.fn().mockResolvedValue(
        new Map<string, unknown>([
          [
            'nip61',
            {
              mints: ['https://mint.ok'],
              relays: ['https://invalid-relay'],
              p2pk: RECIPIENT_P2PK,
            },
          ],
        ])
      ),
    });

    const malformedOutcome = await malformedService.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.ok'],
    });
    expect(malformedOutcome.type).toBe('invalid');

    const ambiguousService = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo: jest.fn().mockResolvedValue(
        new Map<string, unknown>([
          [
            'nip61',
            {
              mints: ['https://mint.a', 'https://mint.b'],
              relays: ['wss://relay.eventinel.com'],
              p2pk: RECIPIENT_P2PK,
            },
          ],
        ])
      ),
    });

    const ambiguousOutcome = await ambiguousService.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a', 'https://mint.b'],
      requireSingleMint: true,
    });
    expect(ambiguousOutcome.type).toBe('ambiguous');
    if (ambiguousOutcome.type !== 'ambiguous') return;
    expect(ambiguousOutcome.candidates).toEqual(['https://mint.a', 'https://mint.b']);
  });

  it('returns invalid for runtime-malformed nip61 field types without throwing', async () => {
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      resolveZapInfo: jest.fn().mockResolvedValue(
        new Map<string, unknown>([
          [
            'nip61',
            {
              mints: 'https://mint.a',
              relays: ['wss://relay.eventinel.com'],
              p2pk: RECIPIENT_P2PK,
            },
          ],
        ])
      ),
    });

    await expect(
      service.discover({
        recipientPubkey: RECIPIENT_PUBKEY,
        senderMintPolicy: ['https://mint.a'],
      })
    ).resolves.toMatchObject({
      type: 'invalid',
      reason: 'Recipient nip61 payload is malformed',
    });
  });

  it('uses ttl cache for repeated lookups', async () => {
    let nowMs = 0;
    const resolveZapInfo = jest.fn().mockResolvedValue(
      new Map<string, unknown>([
        [
          'nip61',
          {
            mints: ['https://mint.a'],
            relays: ['wss://relay.eventinel.com'],
            p2pk: RECIPIENT_P2PK,
          },
        ],
      ])
    );
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      now: () => nowMs,
      defaultCacheTtlMs: 1000,
      resolveZapInfo,
    });

    const first = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
    });
    expect(first.cached).toBe(false);
    expect(resolveZapInfo).toHaveBeenCalledTimes(1);

    nowMs = 500;
    const second = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
    });
    expect(second.cached).toBe(true);
    expect(resolveZapInfo).toHaveBeenCalledTimes(1);

    nowMs = 1200;
    const third = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
    });
    expect(third.cached).toBe(false);
    expect(resolveZapInfo).toHaveBeenCalledTimes(2);
  });

  it('does not cache when ttl is zero', async () => {
    const resolveZapInfo = jest.fn().mockResolvedValue(
      new Map<string, unknown>([
        [
          'nip61',
          {
            mints: ['https://mint.a'],
            relays: ['wss://relay.eventinel.com'],
            p2pk: RECIPIENT_P2PK,
          },
        ],
      ])
    );
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      now: () => 1000,
      resolveZapInfo,
    });

    const first = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
      cacheTtlMs: 0,
    });
    const second = await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
      cacheTtlMs: 0,
    });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(false);
    expect(resolveZapInfo).toHaveBeenCalledTimes(2);
  });

  it('evicts expired cache entries before writing new results', async () => {
    let nowMs = 0;
    const resolveZapInfo = jest.fn().mockResolvedValue(
      new Map<string, unknown>([
        [
          'nip61',
          {
            mints: ['https://mint.a'],
            relays: ['wss://relay.eventinel.com'],
            p2pk: RECIPIENT_P2PK,
          },
        ],
      ])
    );
    const service = new CashuRecipientDiscoveryService({
      enabled: true,
      now: () => nowMs,
      defaultCacheTtlMs: 1000,
      resolveZapInfo,
    });

    await service.discover({
      recipientPubkey: RECIPIENT_PUBKEY,
      senderMintPolicy: ['https://mint.a'],
    });
    expect((service as any).cache.size).toBe(1);

    nowMs = 1200;
    await service.discover({
      recipientPubkey: 'c'.repeat(64),
      senderMintPolicy: ['https://mint.a'],
    });

    expect((service as any).cache.size).toBe(1);
  });
});
