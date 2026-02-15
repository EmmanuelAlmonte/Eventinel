#!/usr/bin/env node

/**
 * Relay AUTH handshake probe (raw WebSocket mode).
 *
 * Usage:
 *   node scripts/relay-auth-check.js --relay wss://relay.eventinel.com/ --limit 5 --timeoutMs 12000
 */

const { finalizeEvent, generateSecretKey, getPublicKey, nip19 } = require('nostr-tools');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ts() {
  return new Date().toISOString();
}

function normalizeRelay(relay) {
  if (!relay) return relay;
  return relay.endsWith('/') ? relay : `${relay}/`;
}

function parseSecretKey(args) {
  const providedNsec = args.nsec || process.env.TEST_NSEC || process.env.NOSTR_TEST_NSEC;
  if (!providedNsec) return generateSecretKey();

  const decoded = nip19.decode(providedNsec);
  if (decoded.type !== 'nsec') {
    throw new Error(`Expected nsec key, got ${decoded.type}`);
  }

  return decoded.data;
}

function buildAuthEventTemplate(relay, challenge) {
  return {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['relay', relay],
      ['challenge', challenge],
    ],
    content: '',
  };
}

function createSubscriptionId() {
  return `auth-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runAttempt({ relay, limit, timeoutMs, withAuth, secretKey }) {
  const socketCtor = globalThis.WebSocket;
  if (typeof socketCtor !== 'function') {
    return {
      withAuth,
      source: 'error:no-websocket-runtime',
      durationMs: 0,
      authRequests: 0,
      authSent: 0,
      eose: false,
      closeReasons: [],
      eventCount: 0,
      subscriptionId: null,
    };
  }

  const events = [];
  const closeReasons = [];
  let authRequests = 0;
  let authSent = 0;
  let eose = false;
  let done = false;
  const started = Date.now();
  const subscriptionId = createSubscriptionId();

  return new Promise((resolve) => {
    let socket;
    let timer;

    const finish = (source) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);

      if (socket && socket.readyState === socketCtor.OPEN) {
        try {
          socket.send(JSON.stringify(['CLOSE', subscriptionId]));
        } catch {
          // ignore close send errors
        }
      }

      if (socket && (socket.readyState === socketCtor.OPEN || socket.readyState === socketCtor.CONNECTING)) {
        try {
          socket.close();
        } catch {
          // ignore close errors
        }
      }

      resolve({
        withAuth,
        source,
        durationMs: Date.now() - started,
        authRequests,
        authSent,
        eose,
        closeReasons,
        eventCount: events.length,
        subscriptionId,
      });
    };

    try {
      socket = new socketCtor(relay);
    } catch (error) {
      closeReasons.push(`socket-error:${error instanceof Error ? error.message : String(error)}`);
      finish('socket-error');
      return;
    }

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify(['REQ', subscriptionId, { kinds: [30911], limit }]));
      } catch (error) {
        closeReasons.push(`send-error:${error instanceof Error ? error.message : String(error)}`);
        finish('send-error');
      }
    };

    socket.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : String(event.data ?? '');
      const message = parseMessage(payload);
      if (!Array.isArray(message) || message.length === 0) return;

      const type = message[0];

      if (type === 'AUTH') {
        authRequests += 1;
        const challenge = String(message[1] ?? '');
        console.log(`[${ts()}] AUTH challenge received (sub=${subscriptionId})`);

        if (withAuth && challenge) {
          try {
            const authEventTemplate = buildAuthEventTemplate(relay, challenge);
            const signedAuthEvent = finalizeEvent(authEventTemplate, secretKey);
            socket.send(JSON.stringify(['AUTH', signedAuthEvent]));
            authSent += 1;
            console.log(`[${ts()}] AUTH event sent`);
          } catch (error) {
            closeReasons.push(`auth-sign-error:${error instanceof Error ? error.message : String(error)}`);
          }
        }

        return;
      }

      if (type === 'EVENT') {
        const messageSubId = message[1];
        const relayEvent = message[2];
        if (messageSubId === subscriptionId && relayEvent && typeof relayEvent === 'object') {
          events.push(relayEvent);
        }
        return;
      }

      if (type === 'EOSE') {
        const messageSubId = message[1];
        if (messageSubId === subscriptionId) {
          eose = true;
          console.log(`[${ts()}] EOSE reached (events=${events.length})`);
          finish('eose');
        }
        return;
      }

      if (type === 'NOTICE') {
        closeReasons.push(`notice:${String(message[1] ?? '')}`);
        return;
      }

      if (type === 'CLOSED') {
        const messageSubId = message[1];
        const reason = String(message[2] ?? 'unknown');
        if (messageSubId === subscriptionId) {
          closeReasons.push(`closed:${reason}`);
          if (!eose) {
            finish('closed');
          }
        }
      }
    };

    socket.onerror = (error) => {
      const message =
        error && typeof error.message === 'string'
          ? error.message
          : 'websocket-error';
      closeReasons.push(`error:${message}`);
    };

    socket.onclose = (event) => {
      closeReasons.push(`close:${event.code}${event.reason ? `:${event.reason}` : ''}`);
      if (!eose) {
        finish('close');
      }
    };

    timer = setTimeout(() => {
      console.log(`[${ts()}] timeout reached`);
      finish('timeout');
    }, timeoutMs);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const relay = normalizeRelay(args.relay || process.env.EXPO_PUBLIC_NOSTR_RELAYS || 'wss://relay.eventinel.com/');
  const limit = Math.max(1, Math.floor(toNumber(args.limit, 5)));
  const timeoutMs = Math.max(1000, Math.floor(toNumber(args.timeoutMs, 12000)));

  const secretKey = parseSecretKey(args);
  const pubkey = getPublicKey(secretKey);

  console.log('Relay AUTH check (raw WS)');
  console.log(`  relay: ${relay}`);
  console.log(`  filter: { kinds:[30911], limit:${limit} }`);
  console.log(`  timeoutMs: ${timeoutMs}`);
  console.log(`  test pubkey: ${pubkey}`);
  console.log('');

  console.log('Attempt 1: WITHOUT AUTH response');
  const withoutAuth = await runAttempt({
    relay,
    limit,
    timeoutMs,
    withAuth: false,
    secretKey,
  });
  console.log(`Result without auth: ${JSON.stringify(withoutAuth, null, 2)}`);
  console.log('');

  console.log('Attempt 2: WITH AUTH response');
  const withAuth = await runAttempt({
    relay,
    limit,
    timeoutMs,
    withAuth: true,
    secretKey,
  });
  console.log(`Result with auth: ${JSON.stringify(withAuth, null, 2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
