#!/usr/bin/env node

/*
 * Single-geohash precision probe (raw WebSocket mode).
 *
 * Purpose:
 * - Query incidents using exactly ONE geohash value per request
 * - Compare results across geohash precisions (default: 6,7,8)
 *
 * Usage:
 *   TEST_NSEC=<nsec> node scripts/single-geohash-precision-probe.js \
 *     --relay wss://relay.eventinel.com/ \
 *     --lat 40.0345567 --lng -75.0433367 \
 *     --precisions 6,7,8 --limit 200 --timeoutMs 12000
 *
 * Notes:
 * - Relay matching for #g is exact tag matching.
 * - This script intentionally does NOT query neighboring cells.
 */

const geohash = require('ngeohash');
const { finalizeEvent, generateSecretKey, nip19 } = require('nostr-tools');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env', quiet: true });
  dotenv.config({ path: '.env.local', override: true, quiet: true });
} catch {
  // Ignore missing dotenv in non-repo contexts.
}

const KIND_INCIDENT = 30911;
const METERS_PER_MILE = 1609.344;

const DEFAULTS = {
  relay: 'wss://relay.eventinel.com/',
  precisions: [6, 7, 8],
  limit: 200,
  timeoutMs: 12000,
  geohashTagKey: 'g',
  maxRows: 5,
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

function toInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRelay(relay) {
  if (!relay) return relay;
  return relay.endsWith('/') ? relay : `${relay}/`;
}

function parseRelay(input) {
  if (!input || typeof input !== 'string') return null;
  const first = input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)[0];
  return first || null;
}

function parsePrecisions(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULTS.precisions;
  }

  const parsed = value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12);

  if (parsed.length === 0) {
    return DEFAULTS.precisions;
  }

  return Array.from(new Set(parsed));
}

function parseSecretKey(args) {
  const providedNsec = args.nsec || process.env.TEST_NSEC || process.env.NOSTR_TEST_NSEC;
  if (!providedNsec) {
    return { secretKey: generateSecretKey(), source: 'ephemeral' };
  }

  const decoded = nip19.decode(providedNsec);
  if (decoded.type !== 'nsec') {
    throw new Error(`Expected nsec key, got ${decoded.type}`);
  }
  return { secretKey: decoded.data, source: 'TEST_NSEC' };
}

function createSubId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function getTagValue(tags, key) {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (Array.isArray(tag) && tag[0] === key && typeof tag[1] === 'string') {
      return tag[1];
    }
  }
  return null;
}

function parseIncidentEvent(event) {
  if (!event || event.kind !== KIND_INCIDENT) return null;

  let content;
  try {
    content = JSON.parse(event.content || '{}');
  } catch {
    return null;
  }

  const lat = Number(content.lat);
  const lng = Number(content.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const createdAtSec = Number(event.created_at) || 0;
  const occurredAtMs = Number.isFinite(Date.parse(content.occurredAt))
    ? Date.parse(content.occurredAt)
    : createdAtSec * 1000;

  return {
    eventId: String(event.id || ''),
    incidentId: String(getTagValue(event.tags, 'd') || event.id || ''),
    createdAtSec,
    occurredAtMs,
    lat,
    lng,
    type: String(getTagValue(event.tags, 'type') || content.type || 'unknown'),
    severity: String(getTagValue(event.tags, 'severity') || content.severity || 'unknown'),
    geohash: String(getTagValue(event.tags, 'g') || ''),
    address: String(getTagValue(event.tags, 'address') || content.title || 'n/a'),
  };
}

function dedupeByIncident(events) {
  const byIncident = new Map();

  for (const event of events) {
    const parsed = parseIncidentEvent(event);
    if (!parsed) continue;

    const existing = byIncident.get(parsed.incidentId);
    if (!existing) {
      byIncident.set(parsed.incidentId, parsed);
      continue;
    }

    if (parsed.createdAtSec > existing.createdAtSec) {
      byIncident.set(parsed.incidentId, parsed);
      continue;
    }

    if (parsed.createdAtSec === existing.createdAtSec && parsed.eventId > existing.eventId) {
      byIncident.set(parsed.incidentId, parsed);
    }
  }

  return Array.from(byIncident.values());
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(fromLat, fromLng, toLat, toLng) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  const normalized = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(normalized), Math.sqrt(1 - normalized));

  return earthRadiusMeters * c;
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return NaN;
  const index = Math.max(
    0,
    Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * ratio))
  );
  return sortedValues[index];
}

function formatMiles(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(2)} mi`;
}

function fetchEvents({ relay, filter, timeoutMs, secretKey }) {
  return new Promise((resolve) => {
    const socketCtor = globalThis.WebSocket;
    if (typeof socketCtor !== 'function') {
      resolve({
        events: [],
        reason: 'error:no-websocket-runtime',
        authCount: 0,
        notices: [],
      });
      return;
    }

    const subId = createSubId('single-g');
    const socket = new socketCtor(relay);
    const events = [];
    const notices = [];
    let authCount = 0;
    let settled = false;
    let timeoutHandle = null;

    function finish(reason) {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      try {
        if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
          socket.close();
        }
      } catch {
        // Ignore socket close errors.
      }
      resolve({ events, reason, authCount, notices });
    }

    timeoutHandle = setTimeout(() => finish('timeout'), timeoutMs);

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(['REQ', subId, filter]));
    });

    socket.addEventListener('message', (incoming) => {
      const message = parseMessage(incoming.data);
      if (!Array.isArray(message) || message.length < 1) return;

      const kind = message[0];
      if (kind === 'AUTH' && typeof message[1] === 'string') {
        try {
          const authEvent = buildAuthEvent(relay, message[1], secretKey);
          socket.send(JSON.stringify(['AUTH', authEvent]));
          authCount += 1;
        } catch (error) {
          notices.push(`auth-error:${error?.message || String(error)}`);
        }
        return;
      }

      if (kind === 'EVENT' && message[1] === subId && message[2] && typeof message[2] === 'object') {
        events.push(message[2]);
        return;
      }

      if (kind === 'EOSE' && message[1] === subId) {
        finish('eose');
        return;
      }

      if (kind === 'NOTICE' && typeof message[1] === 'string') {
        notices.push(message[1]);
        return;
      }

      if (kind === 'CLOSED' && message[1] === subId) {
        const why = typeof message[2] === 'string' ? message[2] : 'closed';
        finish(`closed:${why}`);
      }
    });

    socket.addEventListener('error', () => finish('socket-error'));
    socket.addEventListener('close', () => finish('socket-close'));
  });
}

async function probePrecision({
  precision,
  lat,
  lng,
  relay,
  geohashTagKey,
  limit,
  timeoutMs,
  secretKey,
}) {
  const centerHash = geohash.encode(lat, lng, precision);
  const filter = {
    kinds: [KIND_INCIDENT],
    limit,
    [`#${geohashTagKey}`]: [centerHash],
  };

  const snapshot = await fetchEvents({
    relay,
    filter,
    timeoutMs,
    secretKey,
  });

  const deduped = dedupeByIncident(snapshot.events);
  const withDistance = deduped
    .map((incident) => {
      const meters = distanceMeters(lat, lng, incident.lat, incident.lng);
      return { ...incident, distanceMeters: meters };
    })
    .sort((a, b) => {
      const distanceDelta = a.distanceMeters - b.distanceMeters;
      if (distanceDelta !== 0) return distanceDelta;

      const occurredDelta = b.occurredAtMs - a.occurredAtMs;
      if (occurredDelta !== 0) return occurredDelta;

      return a.incidentId.localeCompare(b.incidentId);
    });

  const distancesMiles = withDistance.map((incident) => incident.distanceMeters / METERS_PER_MILE);
  const incidentIdSet = new Set(withDistance.map((incident) => incident.incidentId));

  return {
    precision,
    centerHash,
    filter,
    snapshot,
    withDistance,
    incidentIdSet,
    summary: {
      rawEvents: snapshot.events.length,
      uniqueIncidents: withDistance.length,
      nearestMiles: distancesMiles[0],
      p50Miles: percentile(distancesMiles, 0.5),
      p90Miles: percentile(distancesMiles, 0.9),
      within1Mi: distancesMiles.filter((miles) => miles <= 1).length,
      within5Mi: distancesMiles.filter((miles) => miles <= 5).length,
    },
  };
}

function overlapSize(a, b) {
  if (!a || !b) return 0;
  let count = 0;
  for (const value of a) {
    if (b.has(value)) count += 1;
  }
  return count;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { secretKey, source } = parseSecretKey(args);

  const relay = normalizeRelay(
    parseRelay(args.relay) ||
      parseRelay(process.env.EXPO_PUBLIC_NOSTR_RELAYS) ||
      DEFAULTS.relay
  );
  const lat = toNumber(args.lat, NaN);
  const lng = toNumber(args.lng, NaN);
  const limit = Math.max(1, toInteger(args.limit, DEFAULTS.limit));
  const timeoutMs = Math.max(1000, toInteger(args.timeoutMs, DEFAULTS.timeoutMs));
  const maxRows = Math.max(1, toInteger(args.maxRows, DEFAULTS.maxRows));
  const precisions = parsePrecisions(args.precisions);
  const geohashTagKey =
    typeof args.geohashTagKey === 'string' && args.geohashTagKey.trim() !== ''
      ? args.geohashTagKey.trim()
      : DEFAULTS.geohashTagKey;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error('Missing required coordinates. Use --lat <number> --lng <number>.');
    process.exit(1);
  }

  console.log('Single-geohash precision probe');
  console.log(`  relay: ${relay}`);
  console.log(`  auth key source: ${source}`);
  console.log(`  center: [${lng}, ${lat}]`);
  console.log(`  geohash tag key: #${geohashTagKey}`);
  console.log(`  precisions: ${precisions.join(', ')}`);
  console.log(`  limit: ${limit}`);
  console.log(`  timeoutMs: ${timeoutMs}`);
  console.log('');

  const results = [];
  for (const precision of precisions) {
    const result = await probePrecision({
      precision,
      lat,
      lng,
      relay,
      geohashTagKey,
      limit,
      timeoutMs,
      secretKey,
    });
    results.push(result);

    console.log(`precision ${precision} (single #${geohashTagKey})`);
    console.log(`  center geohash: ${result.centerHash}`);
    console.log(`  relay filter: ${JSON.stringify(result.filter)}`);
    console.log(
      `  relay: reason=${result.snapshot.reason}, auth=${result.snapshot.authCount}, raw=${result.summary.rawEvents}, unique=${result.summary.uniqueIncidents}`
    );
    console.log(
      `  distance: nearest=${formatMiles(result.summary.nearestMiles)}, p50=${formatMiles(result.summary.p50Miles)}, p90=${formatMiles(result.summary.p90Miles)}`
    );
    console.log(
      `  within 1mi=${result.summary.within1Mi}, within 5mi=${result.summary.within5Mi}`
    );
    if (result.snapshot.notices.length > 0) {
      console.log(`  notices: ${result.snapshot.notices.join(' | ')}`);
    }

    if (result.withDistance.length > 0) {
      console.log(`  nearest ${Math.min(maxRows, result.withDistance.length)} incident(s):`);
      for (const incident of result.withDistance.slice(0, maxRows)) {
        console.log(
          `    ${incident.distanceMeters.toFixed(0)}m | geohash:${incident.geohash || 'n/a'} | type:${incident.type} | sev:${incident.severity} | id:${incident.incidentId}`
        );
      }
    }
    console.log('');
  }

  if (results.length > 1) {
    console.log('Incident-id overlap between precision runs');
    for (let i = 0; i < results.length - 1; i += 1) {
      const a = results[i];
      const b = results[i + 1];
      const common = overlapSize(a.incidentIdSet, b.incidentIdSet);
      const baseline = a.incidentIdSet.size || 1;
      const pct = ((common / baseline) * 100).toFixed(1);
      console.log(
        `  p${a.precision} -> p${b.precision}: common=${common}/${a.incidentIdSet.size} (${pct}%)`
      );
    }
  }
}

run().catch((error) => {
  console.error('Single-geohash precision probe failed:', error);
  process.exit(1);
});
