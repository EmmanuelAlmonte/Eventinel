#!/usr/bin/env node

/*
 * Incident Relay Probe (raw WebSocket mode)
 *
 * Uses the same low-level request flow that succeeded in relay diagnostics:
 *   OPEN -> ["REQ", <subId>, <filter>] -> EVENT... -> EOSE
 *
 * Runs repeatable snapshots to compare:
 * 1) Global filter for kind:30911
 * 2) Geohash-local candidate filter (#g with center+neighbors)
 *
 * Usage:
 *   node scripts/incident-relay-probe.js --runs 5 --relay wss://relay.eventinel.com/ --lat 40.0345567 --lng -75.0433367
 */

const geohash = require('ngeohash');
const { finalizeEvent, generateSecretKey, getPublicKey, nip19 } = require('nostr-tools');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env', quiet: true });
  dotenv.config({ path: '.env.local', override: true, quiet: true });
} catch {
  // Ignore missing dotenv in non-repo contexts.
}

const KIND_INCIDENT = 30911;
const DEFAULT_LIMIT = 200;
const DEFAULT_RUNS = 5;
const DEFAULT_TIMEOUT_MS = 12000;
const GEOHASH_PRECISION = 5;
const MILES_PER_METER = 0.000621371;

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

function parseSecretKey(args) {
  const providedNsec = args.nsec || process.env.TEST_NSEC || process.env.NOSTR_TEST_NSEC;
  if (!providedNsec) return generateSecretKey();

  const decoded = nip19.decode(providedNsec);
  if (decoded.type !== 'nsec') {
    throw new Error(`Expected nsec key, got ${decoded.type}`);
  }

  return decoded.data;
}

function getNeighborCells(centerHash) {
  const raw = geohash.neighbors(centerHash);
  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  if (raw && typeof raw === 'object') {
    return Object.values(raw).filter(Boolean);
  }

  return [];
}

function parseRelay(input) {
  if (!input || typeof input !== 'string') return null;
  const relay = input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)[0];
  return relay || null;
}

function normalizeRelay(relay) {
  if (!relay) return relay;
  return relay.endsWith('/') ? relay : `${relay}/`;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(aLat, aLng, bLat, bLng) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(bLng - aLng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const clamped = Math.max(0, Math.min(1, h));
  const c = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));

  return earthRadiusMeters * c;
}

function getTagValue(tags, key) {
  if (!Array.isArray(tags)) return undefined;
  for (const tag of tags) {
    if (Array.isArray(tag) && tag[0] === key) {
      return tag[1];
    }
  }
  return undefined;
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

  const incidentId = getTagValue(event.tags, 'd') || event.id;
  const createdAt = Number(event.created_at) || 0;
  const occurredAtMs = Number.isFinite(Date.parse(content.occurredAt))
    ? Date.parse(content.occurredAt)
    : createdAt * 1000;

  return {
    eventId: String(event.id || ''),
    incidentId: String(incidentId),
    createdAt,
    occurredAtMs,
    lat,
    lng,
  };
}

function dedupeIncidents(events) {
  const byIncidentId = new Map();

  for (const event of events) {
    const parsed = parseIncidentEvent(event);
    if (!parsed) continue;

    const existing = byIncidentId.get(parsed.incidentId);
    if (!existing) {
      byIncidentId.set(parsed.incidentId, parsed);
      continue;
    }

    if (parsed.createdAt > existing.createdAt) {
      byIncidentId.set(parsed.incidentId, parsed);
      continue;
    }

    if (parsed.createdAt === existing.createdAt && parsed.eventId > existing.eventId) {
      byIncidentId.set(parsed.incidentId, parsed);
    }
  }

  return Array.from(byIncidentId.values());
}

function sortLikeApp(incidents, userLat, userLng) {
  return incidents
    .map((incident) => {
      const distanceMeters = haversineMeters(userLat, userLng, incident.lat, incident.lng);
      return { ...incident, distanceMeters };
    })
    .sort((a, b) => {
      const distanceDelta = a.distanceMeters - b.distanceMeters;
      if (distanceDelta !== 0) return distanceDelta;

      const occurredDelta = b.occurredAtMs - a.occurredAtMs;
      if (occurredDelta !== 0) return occurredDelta;

      return a.incidentId.localeCompare(b.incidentId);
    });
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return NaN;
  const index = Math.max(0, Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * ratio)));
  return sortedValues[index];
}

function formatMiles(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(2)} mi`;
}

function summarize(sortedIncidents) {
  const distancesMiles = sortedIncidents.map((item) => item.distanceMeters * MILES_PER_METER);
  const within = (miles) => distancesMiles.filter((distance) => distance <= miles).length;

  return {
    uniqueIncidents: sortedIncidents.length,
    nearestMiles: distancesMiles[0],
    p25Miles: percentile(distancesMiles, 0.25),
    p50Miles: percentile(distancesMiles, 0.5),
    p90Miles: percentile(distancesMiles, 0.9),
    within5: within(5),
    within10: within(10),
    within25: within(25),
    within50: within(50),
  };
}

function printSummary(label, snapshot, summary) {
  console.log(
    `  ${label}: raw=${snapshot.events.length}, unique=${summary.uniqueIncidents}, source=${snapshot.reason}, auth=${snapshot.authCount}`
  );
  console.log(
    `    nearest=${formatMiles(summary.nearestMiles)}, p50=${formatMiles(summary.p50Miles)}, p90=${formatMiles(summary.p90Miles)}`
  );
  console.log(
    `    within 5/10/25/50 mi = ${summary.within5}/${summary.within10}/${summary.within25}/${summary.within50}`
  );
  if (snapshot.notices.length > 0) {
    console.log(`    notices: ${snapshot.notices.join(' | ')}`);
  }
}

function createSubscriptionId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fetchSnapshotRaw({ relay, filter, timeoutMs, subPrefix, secretKey }) {
  return new Promise((resolve) => {
    const socketCtor = globalThis.WebSocket;
    if (typeof socketCtor !== 'function') {
      resolve({
        events: [],
        reason: 'error:no-websocket-runtime',
        authCount: 0,
        notices: [],
        subscriptionId: createSubscriptionId(subPrefix),
      });
      return;
    }

    const subscriptionId = createSubscriptionId(subPrefix);
    const events = [];
    const notices = [];
    let authCount = 0;
    let authSent = 0;
    let done = false;
    let socket;
    let timer;

    const finish = (reason) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);

      if (socket && socket.readyState === socketCtor.OPEN) {
        try {
          socket.send(JSON.stringify(['CLOSE', subscriptionId]));
        } catch {
          // ignore CLOSE send errors
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
        events,
        reason,
        authCount,
        authSent,
        notices,
        subscriptionId,
      });
    };

    try {
      socket = new socketCtor(relay);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finish(`error:${message}`);
      return;
    }

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify(['REQ', subscriptionId, filter]));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        finish(`error:send-failed:${message}`);
      }
    };

    socket.onmessage = (event) => {
      const payload = typeof event.data === 'string' ? event.data : String(event.data ?? '');
      const message = parseMessage(payload);
      if (!Array.isArray(message) || message.length === 0) return;

      const type = message[0];

      if (type === 'AUTH') {
        authCount += 1;
        const challenge = String(message[1] ?? '');
        if (challenge) {
          try {
            const authEvent = finalizeEvent(buildAuthEventTemplate(relay, challenge), secretKey);
            socket.send(JSON.stringify(['AUTH', authEvent]));
            authSent += 1;
          } catch (error) {
            const messageText = error instanceof Error ? error.message : String(error);
            notices.push(`auth-sign-error:${messageText}`);
          }
        }
        return;
      }

      if (type === 'NOTICE') {
        notices.push(String(message[1] ?? ''));
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
          finish('eose');
        }
        return;
      }

      if (type === 'CLOSED') {
        const messageSubId = message[1];
        const reason = String(message[2] ?? 'unknown');
        if (messageSubId === subscriptionId) {
          finish(`closed:${reason}`);
        }
      }
    };

    socket.onerror = (error) => {
      const message =
        error && typeof error.message === 'string'
          ? error.message
          : 'websocket-error';
      finish(`error:${message}`);
    };

    socket.onclose = (event) => {
      if (!done) {
        const reason = event.reason ? `:${event.reason}` : '';
        finish(`close:${event.code}${reason}`);
      }
    };

    timer = setTimeout(() => {
      finish('timeout');
    }, timeoutMs);
  });
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  const relay = normalizeRelay(
    parseRelay(args.relay) || parseRelay(process.env.EXPO_PUBLIC_NOSTR_RELAYS) || 'wss://relay.eventinel.com/'
  );
  const lat = toNumber(args.lat, NaN);
  const lng = toNumber(args.lng, NaN);
  const runs = Math.max(1, Math.floor(toNumber(args.runs, DEFAULT_RUNS)));
  const limit = Math.max(1, Math.floor(toNumber(args.limit, DEFAULT_LIMIT)));
  const timeoutMs = Math.max(1000, Math.floor(toNumber(args.timeoutMs, DEFAULT_TIMEOUT_MS)));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error('Missing required coordinates. Use --lat <number> --lng <number>.');
    process.exit(1);
  }

  const centerHash = geohash.encode(lat, lng, GEOHASH_PRECISION);
  const neighborHashes = getNeighborCells(centerHash);
  const geohashSet = Array.from(
    new Set([centerHash, ...neighborHashes].filter(Boolean))
  );

  const globalFilter = { kinds: [KIND_INCIDENT], limit };
  const localFilter = { kinds: [KIND_INCIDENT], limit, '#g': geohashSet };
  const secretKey = parseSecretKey(args);
  const authPubkey = getPublicKey(secretKey);

  console.log('Incident relay probe');
  console.log(`  relay: ${relay}`);
  console.log(`  location: lat=${lat}, lng=${lng}`);
  console.log(`  runs: ${runs}, limit: ${limit}, timeoutMs: ${timeoutMs}`);
  console.log(`  auth pubkey: ${authPubkey}`);
  console.log(`  geohash center: ${centerHash}, cells: ${geohashSet.join(',')}`);
  console.log('');

  const rows = [];

  for (let i = 1; i <= runs; i += 1) {
    const startedAt = Date.now();

    const globalSnapshot = await fetchSnapshotRaw({
      relay,
      filter: globalFilter,
      timeoutMs,
      subPrefix: 'probe-global',
      secretKey,
    });
    const localSnapshot = await fetchSnapshotRaw({
      relay,
      filter: localFilter,
      timeoutMs,
      subPrefix: 'probe-local',
      secretKey,
    });

    const globalIncidents = sortLikeApp(dedupeIncidents(globalSnapshot.events), lat, lng);
    const localIncidents = sortLikeApp(dedupeIncidents(localSnapshot.events), lat, lng);

    const globalSummary = summarize(globalIncidents);
    const localSummary = summarize(localIncidents);

    const durationMs = Date.now() - startedAt;

    rows.push({
      run: i,
      durationMs,
      globalRaw: globalSnapshot.events.length,
      globalWithin25: globalSummary.within25,
      globalWithin50: globalSummary.within50,
      globalMedianMiles: globalSummary.p50Miles,
      localRaw: localSnapshot.events.length,
      localWithin25: localSummary.within25,
      localWithin50: localSummary.within50,
      localMedianMiles: localSummary.p50Miles,
    });

    console.log(`Run ${i}/${runs} (${durationMs}ms)`);
    printSummary('Global limit', globalSnapshot, globalSummary);
    printSummary('Geo #g filter', localSnapshot, localSummary);
    console.log('');
  }

  const avg = (values) => {
    const valid = values.filter((value) => Number.isFinite(value));
    if (valid.length === 0) return NaN;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  };

  const globalWithin25Avg = avg(rows.map((row) => row.globalWithin25));
  const globalWithin50Avg = avg(rows.map((row) => row.globalWithin50));
  const localWithin25Avg = avg(rows.map((row) => row.localWithin25));
  const localWithin50Avg = avg(rows.map((row) => row.localWithin50));

  console.log('Aggregate across runs');
  console.log(`  Global avg within 25/50 mi: ${globalWithin25Avg.toFixed(2)}/${globalWithin50Avg.toFixed(2)}`);
  console.log(`  Local  avg within 25/50 mi: ${localWithin25Avg.toFixed(2)}/${localWithin50Avg.toFixed(2)}`);
  console.log('');

  console.log('Compact results');
  console.table(
    rows.map((row) => ({
      run: row.run,
      ms: row.durationMs,
      gRaw: row.globalRaw,
      g25: row.globalWithin25,
      g50: row.globalWithin50,
      gP50mi: Number.isFinite(row.globalMedianMiles) ? row.globalMedianMiles.toFixed(2) : 'n/a',
      lRaw: row.localRaw,
      l25: row.localWithin25,
      l50: row.localWithin50,
      lP50mi: Number.isFinite(row.localMedianMiles) ? row.localMedianMiles.toFixed(2) : 'n/a',
    }))
  );
}

run().catch((error) => {
  console.error('Probe failed:', error);
  process.exit(1);
});
