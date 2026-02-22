import { ndk } from '@lib/ndk';
import { isCashuRecipientDiscoveryFeatureEnabled } from '@lib/featureFlags';

const DEFAULT_ZAP_INFO_TIMEOUT_MS = 2500;
const DEFAULT_CACHE_TTL_MS = 30_000;
const HEX_PUBKEY_PATTERN = /^[a-f0-9]{64}$/i;

type Nip61Payload = {
  mints?: string[];
  relays?: string[];
  p2pk?: string;
};

type ResolveZapInfoFn = (
  recipientPubkey: string,
  timeoutMs: number
) => Promise<Map<string, unknown>>;

type DiscoveryDecision =
  | { type: 'found'; target: CashuRecipientTarget }
  | { type: 'ambiguous'; candidates: string[] }
  | { type: 'not_found' }
  | { type: 'incompatible'; senderMints: string[]; recipientMints: string[] }
  | { type: 'invalid'; reason: string };

type CacheEntry = {
  expiresAt: number;
  outcome: CashuRecipientDiscoveryOutcome;
};

export type CashuRecipientDiscoveryDebugReason =
  | 'cache_hit'
  | 'cache_miss'
  | 'feature_disabled'
  | 'invalid_recipient_pubkey'
  | 'invalid_sender_mint_policy'
  | 'get_zap_info_failed'
  | 'nip61_not_found'
  | 'nip61_invalid_shape'
  | 'nip61_invalid_mints'
  | 'nip61_invalid_relays'
  | 'nip61_invalid_p2pk'
  | 'mint_policy_incompatible'
  | 'mint_selection_ambiguous'
  | 'mint_selected';

export type CashuRecipientDiscoveryDebugEntry = {
  reason: CashuRecipientDiscoveryDebugReason;
  details?: Record<string, unknown>;
};

export type CashuRecipientTarget = {
  recipientPubkey: string;
  p2pk: string;
  mints: string[];
  relays: string[];
  compatibleMints: string[];
  selectedMint: string;
};

export type CashuRecipientDiscoveryRequest = {
  recipientPubkey: string;
  senderMintPolicy: string[];
  cacheTtlMs?: number;
  timeoutMs?: number;
  forceRefresh?: boolean;
  requireSingleMint?: boolean;
  debug?: (entry: CashuRecipientDiscoveryDebugEntry) => void;
};

export type CashuRecipientDiscoveryOutcome = DiscoveryDecision & {
  cached: boolean;
  debug: CashuRecipientDiscoveryDebugEntry[];
};

export type CashuRecipientDiscoveryServiceOptions = {
  enabled?: boolean;
  now?: () => number;
  defaultCacheTtlMs?: number;
  defaultTimeoutMs?: number;
  resolveZapInfo?: ResolveZapInfoFn;
};

export class CashuRecipientDiscoveryService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly enabled: boolean;
  private readonly now: () => number;
  private readonly defaultCacheTtlMs: number;
  private readonly defaultTimeoutMs: number;
  private readonly resolveZapInfo: ResolveZapInfoFn;

  constructor(options: CashuRecipientDiscoveryServiceOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.now = options.now ?? Date.now;
    this.defaultCacheTtlMs = options.defaultCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_ZAP_INFO_TIMEOUT_MS;
    this.resolveZapInfo = options.resolveZapInfo ?? resolveZapInfoFromNdk;
  }

  clearCache() {
    this.cache.clear();
  }

  async discover(
    request: CashuRecipientDiscoveryRequest
  ): Promise<CashuRecipientDiscoveryOutcome> {
    const debugEntries: CashuRecipientDiscoveryDebugEntry[] = [];
    const pushDebug = (entry: CashuRecipientDiscoveryDebugEntry) => {
      debugEntries.push(entry);
      request.debug?.(entry);
    };

    if (!this.enabled) {
      pushDebug({ reason: 'feature_disabled' });
      return buildOutcome(
        { type: 'invalid', reason: 'Cashu recipient discovery is disabled' },
        false,
        debugEntries
      );
    }

    const input = normalizeInput(request, this.defaultCacheTtlMs, this.defaultTimeoutMs, pushDebug);
    if ('type' in input) {
      return buildOutcome(input, false, debugEntries);
    }

    const cacheKey = buildCacheKey(input.recipientPubkey, input.senderMintPolicy, input.requireSingleMint);
    const now = this.now();
    if (!input.forceRefresh) {
      const cachedEntry = this.cache.get(cacheKey);
      if (cachedEntry && cachedEntry.expiresAt > now) {
        pushDebug({
          reason: 'cache_hit',
          details: { expiresAt: cachedEntry.expiresAt },
        });
        return {
          ...cachedEntry.outcome,
          cached: true,
          debug: [...cachedEntry.outcome.debug, ...debugEntries],
        };
      }
    }

    pushDebug({ reason: 'cache_miss' });
    const decision = await this.resolveDecision(input, pushDebug);
    const outcome = buildOutcome(decision, false, debugEntries);
    this.cache.set(cacheKey, {
      expiresAt: now + input.cacheTtlMs,
      outcome,
    });

    return outcome;
  }

  private async resolveDecision(
    input: NormalizedInput,
    pushDebug: (entry: CashuRecipientDiscoveryDebugEntry) => void
  ): Promise<DiscoveryDecision> {
    let zapInfoMap: Map<string, unknown>;
    try {
      zapInfoMap = await this.resolveZapInfo(input.recipientPubkey, input.timeoutMs);
    } catch (error) {
      pushDebug({
        reason: 'get_zap_info_failed',
        details: { error: error instanceof Error ? error.message : String(error) },
      });
      return { type: 'invalid', reason: 'Failed to load recipient zap info' };
    }

    const nip61 = zapInfoMap.get('nip61');
    if (!nip61) {
      pushDebug({ reason: 'nip61_not_found' });
      return { type: 'not_found' };
    }
    if (!isNip61Payload(nip61)) {
      pushDebug({ reason: 'nip61_invalid_shape' });
      return { type: 'invalid', reason: 'Recipient nip61 payload is malformed' };
    }

    const mintsResult = normalizeMintList(nip61.mints ?? []);
    if (mintsResult.invalid.length > 0 || mintsResult.values.length === 0) {
      pushDebug({
        reason: 'nip61_invalid_mints',
        details: {
          invalidMints: mintsResult.invalid,
          mints: nip61.mints ?? [],
        },
      });
      return { type: 'invalid', reason: 'Recipient nip61 mints are invalid' };
    }

    const relaysResult = normalizeRelayList(nip61.relays ?? []);
    if (relaysResult.invalid.length > 0) {
      pushDebug({
        reason: 'nip61_invalid_relays',
        details: {
          invalidRelays: relaysResult.invalid,
          relays: nip61.relays ?? [],
        },
      });
      return { type: 'invalid', reason: 'Recipient nip61 relays are invalid' };
    }

    const p2pk = (nip61.p2pk ?? input.recipientPubkey).toLowerCase();
    if (!HEX_PUBKEY_PATTERN.test(p2pk)) {
      pushDebug({
        reason: 'nip61_invalid_p2pk',
        details: { p2pk },
      });
      return { type: 'invalid', reason: 'Recipient nip61 p2pk is invalid' };
    }

    const senderMintSet = new Set(input.senderMintPolicy);
    const compatibleMints = mintsResult.values.filter((mint) => senderMintSet.has(mint)).sort();
    if (compatibleMints.length === 0) {
      pushDebug({
        reason: 'mint_policy_incompatible',
        details: {
          senderMintPolicy: input.senderMintPolicy,
          recipientMints: mintsResult.values,
        },
      });
      return {
        type: 'incompatible',
        senderMints: input.senderMintPolicy,
        recipientMints: mintsResult.values,
      };
    }

    if (input.requireSingleMint && compatibleMints.length > 1) {
      pushDebug({
        reason: 'mint_selection_ambiguous',
        details: { compatibleMints },
      });
      return { type: 'ambiguous', candidates: compatibleMints };
    }

    const selectedMint = compatibleMints[0];
    pushDebug({
      reason: 'mint_selected',
      details: { selectedMint, compatibleMints },
    });
    return {
      type: 'found',
      target: {
        recipientPubkey: input.recipientPubkey,
        p2pk,
        mints: mintsResult.values,
        relays: relaysResult.values,
        compatibleMints,
        selectedMint,
      },
    };
  }
}

const defaultCashuRecipientDiscoveryService = new CashuRecipientDiscoveryService({
  enabled: isCashuRecipientDiscoveryFeatureEnabled,
});

export async function discoverCashuRecipient(
  request: CashuRecipientDiscoveryRequest
): Promise<CashuRecipientDiscoveryOutcome> {
  return defaultCashuRecipientDiscoveryService.discover(request);
}

export function clearCashuRecipientDiscoveryCache() {
  defaultCashuRecipientDiscoveryService.clearCache();
}

type NormalizedInput = {
  recipientPubkey: string;
  senderMintPolicy: string[];
  cacheTtlMs: number;
  timeoutMs: number;
  forceRefresh: boolean;
  requireSingleMint: boolean;
};

function buildOutcome(
  decision: DiscoveryDecision,
  cached: boolean,
  debug: CashuRecipientDiscoveryDebugEntry[]
): CashuRecipientDiscoveryOutcome {
  return {
    ...decision,
    cached,
    debug: [...debug],
  };
}

function normalizeInput(
  request: CashuRecipientDiscoveryRequest,
  defaultCacheTtlMs: number,
  defaultTimeoutMs: number,
  pushDebug: (entry: CashuRecipientDiscoveryDebugEntry) => void
): NormalizedInput | { type: 'invalid'; reason: string } {
  const recipientPubkey = request.recipientPubkey.toLowerCase();
  if (!HEX_PUBKEY_PATTERN.test(recipientPubkey)) {
    pushDebug({
      reason: 'invalid_recipient_pubkey',
      details: { recipientPubkey: request.recipientPubkey },
    });
    return { type: 'invalid', reason: 'Recipient pubkey must be 64-char hex' };
  }

  const senderMints = normalizeMintList(request.senderMintPolicy);
  if (senderMints.values.length === 0 || senderMints.invalid.length > 0) {
    pushDebug({
      reason: 'invalid_sender_mint_policy',
      details: {
        senderMintPolicy: request.senderMintPolicy,
        invalidMints: senderMints.invalid,
      },
    });
    return { type: 'invalid', reason: 'Sender mint policy must contain valid mint URLs' };
  }

  return {
    recipientPubkey,
    senderMintPolicy: senderMints.values,
    cacheTtlMs: Math.max(0, request.cacheTtlMs ?? defaultCacheTtlMs),
    timeoutMs: Math.max(0, request.timeoutMs ?? defaultTimeoutMs),
    forceRefresh: Boolean(request.forceRefresh),
    requireSingleMint: Boolean(request.requireSingleMint),
  };
}

function normalizeMintList(urls: string[]): { values: string[]; invalid: string[] } {
  return normalizeUrls(urls, (value) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const lower = normalized.toLowerCase();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return null;
    return normalized.replace(/\/+$/, '');
  });
}

function normalizeRelayList(urls: string[]): { values: string[]; invalid: string[] } {
  return normalizeUrls(urls, (value) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const lower = normalized.toLowerCase();
    if (!lower.startsWith('ws://') && !lower.startsWith('wss://')) return null;
    return normalized.replace(/\/+$/, '');
  });
}

function normalizeUrls(
  rawValues: string[],
  normalize: (value: string) => string | null
): { values: string[]; invalid: string[] } {
  const values: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  rawValues.forEach((rawValue) => {
    const normalized = normalize(rawValue);
    if (!normalized) {
      invalid.push(rawValue);
      return;
    }
    if (!seen.has(normalized)) {
      values.push(normalized);
      seen.add(normalized);
    }
  });

  values.sort();
  return { values, invalid };
}

function isNip61Payload(value: unknown): value is Nip61Payload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.mints != null && !isStringArray(candidate.mints)) {
    return false;
  }
  if (candidate.relays != null && !isStringArray(candidate.relays)) {
    return false;
  }
  if (candidate.p2pk != null && typeof candidate.p2pk !== 'string') {
    return false;
  }

  return true;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function buildCacheKey(
  recipientPubkey: string,
  senderMintPolicy: string[],
  requireSingleMint: boolean
): string {
  return JSON.stringify({
    recipientPubkey,
    senderMintPolicy: [...senderMintPolicy].sort(),
    requireSingleMint,
  });
}

async function resolveZapInfoFromNdk(
  recipientPubkey: string,
  timeoutMs: number
): Promise<Map<string, unknown>> {
  const user = ndk.getUser({ pubkey: recipientPubkey });
  const zapInfo = await user.getZapInfo(timeoutMs);
  return zapInfo as Map<string, unknown>;
}
