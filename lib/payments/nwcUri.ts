export type ParsedNwcUri = {
  /** Wallet service pubkey (hex) */
  pubkey: string;
  /** Relay URLs provided in the URI */
  relays: string[];
  /** NWC secret (private key hex) */
  secret: string;
  /** Normalized input URI (trimmed) */
  uri: string;
};

/**
 * Best-effort parsing for Nostr Wallet Connect URIs.
 *
 * Expected shape (common): `nostr+walletconnect://<pubkey>?relay=wss://...&secret=<hex>`
 *
 * Some wallets may use different schemes; we validate by presence of pubkey + secret + at least one relay.
 */
export function tryParseNwcUri(input: string): ParsedNwcUri | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const pubkey = (u.host || u.pathname).replace(/^\/+/, '');
  const relays = u.searchParams.getAll('relay').filter(Boolean);
  const secret = u.searchParams.get('secret') ?? '';

  if (!pubkey || !secret || relays.length === 0) return null;

  return { pubkey, relays, secret, uri: trimmed };
}

export function redactNwcUriSecret(uri: string): string {
  const parsed = tryParseNwcUri(uri);
  if (!parsed) return uri;
  return uri.replace(parsed.secret, '***');
}

