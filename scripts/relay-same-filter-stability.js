#!/usr/bin/env node

/*
 * Relay same-filter stability probe (raw WebSocket mode).
 *
 * Repeats the exact same REQ filter multiple times and compares:
 * - Full ID-set overlap (content stability in returned limit window)
 * - Top nearest overlap (distance-prioritized stability)
 *
 * Usage:
 *   TEST_NSEC=<nsec> node scripts/relay-same-filter-stability.js \
 *     --relay wss://relay.eventinel.com/ --runs 5 --limit 200 \
 *     --lat 40.0345567 --lng -75.0433367 --timeoutMs 12000
 */

const { finalizeEvent, nip19 } = require('nostr-tools');

const DEFAULTS = {
  relay: 'wss://relay.eventinel.com/',
  runs: 5,
  limit: 200,
  timeoutMs: 12000,
  lat: 40.0345567,
  lng: -75.0433367,
};

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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRelay(relay) {
  if (!relay) return relay;
  return relay.endsWith('/') ? relay : `${relay}/`;
}

function toRad(v) { return (v * Math.PI) / 180; }
function miles(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(1 - Math.min(1, Math.max(0, a))));
  return (R * c) / 1609.344;
}

function parseSecretKey() {
  const nsec = process.env.TEST_NSEC;
  if (!nsec) throw new Error('TEST_NSEC missing');
  const d = nip19.decode(nsec);
  if (d.type !== 'nsec') throw new Error('TEST_NSEC is not nsec');
  return d.data;
}

function buildAuthEvent(relay, challenge, secretKey) {
  return finalizeEvent(
    {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['relay', relay],
        ['challenge', challenge],
      ],
      content: '',
    },
    secretKey
  );
}

function fetchSnapshot({
  idx,
  relay,
  filter,
  timeoutMs,
  userLat,
  userLng,
  secretKey,
}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(relay);
    const subId = `same-200-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const events = [];
    const ids = new Set();
    const closeReasons = [];
    let authReq = 0;
    let authSent = 0;
    let eose = false;
    const started = Date.now();

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({
        idx,
        source: 'timeout',
        elapsedMs: Date.now() - started,
        authReq,
        authSent,
        ids,
        events,
        closeReasons,
      });
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, filter]));
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(typeof evt.data === 'string' ? evt.data : String(evt.data ?? '')); } catch { return; }
      if (!Array.isArray(msg)) return;
      const type = msg[0];
      if (type === 'AUTH') {
        authReq += 1;
        const challenge = String(msg[1] ?? '');
        if (challenge) {
          try {
            ws.send(JSON.stringify(['AUTH', buildAuthEvent(relay, challenge, secretKey)]));
            authSent += 1;
          } catch (err) {
            closeReasons.push(`auth-error:${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } else if (type === 'EVENT') {
        const msgSubId = msg[1];
        const ev = msg[2];
        if (msgSubId === subId && ev && typeof ev === 'object' && typeof ev.id === 'string') {
          ids.add(ev.id);
          events.push(ev);
        }
      } else if (type === 'EOSE') {
        if (msg[1] === subId) {
          eose = true;
          try { ws.send(JSON.stringify(['CLOSE', subId])); } catch {}
          try { ws.close(); } catch {}
        }
      } else if (type === 'NOTICE') {
        closeReasons.push(`notice:${String(msg[1] ?? '')}`);
      } else if (type === 'CLOSED') {
        if (msg[1] === subId) {
          closeReasons.push(`closed:${String(msg[2] ?? 'unknown')}`);
        }
      }
    };

    ws.onerror = (err) => {
      closeReasons.push(`error:${err?.message || 'websocket'}`);
    };

    ws.onclose = () => {
      clearTimeout(timer);
      const parsed = [];
      for (const ev of events) {
        try {
          const c = JSON.parse(ev.content || '{}');
          if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
            parsed.push({ id: ev.id, distance: miles(userLat, userLng, c.lat, c.lng) });
          }
        } catch {}
      }
      parsed.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
      const top25Nearest = parsed.slice(0, 25).map((x) => x.id);
      const within10 = parsed.filter((x) => x.distance <= 10).length;
      resolve({
        idx,
        source: eose ? 'eose' : 'close',
        elapsedMs: Date.now() - started,
        authReq,
        authSent,
        ids,
        total: ids.size,
        top25Nearest,
        within10,
        closeReasons,
      });
    };
  });
}

function overlap(a, b) {
  let common = 0;
  for (const id of a) if (b.has(id)) common += 1;
  return common;
}

function arrayOverlap(a, b) {
  const bSet = new Set(b);
  return a.filter((x) => bSet.has(x)).length;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const relay = normalizeRelay(args.relay || process.env.EXPO_PUBLIC_NOSTR_RELAYS || DEFAULTS.relay);
  const runs = Math.max(1, Math.floor(toNumber(args.runs, DEFAULTS.runs)));
  const timeoutMs = Math.max(1000, Math.floor(toNumber(args.timeoutMs, DEFAULTS.timeoutMs)));
  const limit = Math.max(1, Math.floor(toNumber(args.limit, DEFAULTS.limit)));
  const userLat = toNumber(args.lat, DEFAULTS.lat);
  const userLng = toNumber(args.lng, DEFAULTS.lng);
  const filter = { kinds: [30911], limit };
  const sk = parseSecretKey();

  console.log('Same-filter stability probe');
  console.log(`  relay: ${relay}`);
  console.log(`  filter: ${JSON.stringify(filter)}`);
  console.log(`  runs: ${runs}, timeoutMs: ${timeoutMs}`);
  console.log(`  user location: lat=${userLat}, lng=${userLng}`);
  console.log('');

  const out = [];
  for (let i = 0; i < runs; i += 1) {
    const r = await fetchSnapshot({
      idx: i + 1,
      relay,
      filter,
      timeoutMs,
      userLat,
      userLng,
      secretKey: sk,
    });
    out.push(r);
    console.log(`run ${r.idx}: source=${r.source}, total=${r.total}, within10=${r.within10}, auth=${r.authReq}/${r.authSent}, elapsed=${r.elapsedMs}ms`);
  }

  console.log('\nContent overlap vs run1 (all 200 IDs):');
  const run1 = out[0];
  for (const r of out) {
    const common = overlap(run1.ids, r.ids);
    const pct = run1.total ? ((common / run1.total) * 100).toFixed(1) : '0.0';
    console.log(`run${r.idx}: common=${common}/${run1.total} (${pct}%)`);
  }

  console.log('\nTop25 nearest overlap vs run1:');
  for (const r of out) {
    const common = arrayOverlap(run1.top25Nearest, r.top25Nearest);
    const pct = run1.top25Nearest.length ? ((common / run1.top25Nearest.length) * 100).toFixed(1) : '0.0';
    console.log(`run${r.idx}: common=${common}/${run1.top25Nearest.length} (${pct}%)`);
  }
})().catch((error) => {
  console.error('Stability probe failed:', error);
  process.exit(1);
});
