#!/usr/bin/env node

/*
 * Client-side incident request probe.
 *
 * Mirrors the direct relay query flow:
 * 1) Relay prefilter with NIP-01 REQ filter (#g and optional day/type tag facets)
 * 2) Client dedupe by incident id (d tag), latest created_at wins
 * 3) Client exact filter by radius and occurredAt window
 *
 * Usage:
 *   TEST_NSEC=<nsec> node scripts/client-side-request-probe.js \
 *     --relay wss://relay.eventinel.com/ \
 *     --lat 40.0345567 --lng -75.0433367 \
 *     --radiusMiles 1 --windowDays 7 \
 *     --limit 500 --geohashPrecision 6 \
 *     --dayTagKey t --dayTagPrefix day: \
 *     --typeToken type:violent_crime
 *
 * Current-data fallback (no relay facet tags):
 *   node scripts/client-side-request-probe.js \
 *     --lat 40.0345567 --lng -75.0433367 \
 *     --radiusMiles 1 --windowDays 7 --limit 500 \
 *     --geohashKey off --dayTagKey off
 */

const geohash = require('ngeohash');
const { finalizeEvent, generateSecretKey, nip19 } = require('nostr-tools');

const KIND_INCIDENT = 30911;
const DAY_MS = 24 * 60 * 60 * 1000;
const MILES_TO_METERS = 1609.344;

const DEFAULTS = {
  relay: 'wss://relay.eventinel.com/',
  radiusMiles: 1,
  windowDays: 7,
  limit: 500,
  timeoutMs: 12000,
  geohashPrecision: 6,
  geohashKey: 'g',
  dayTagKey: 't',
  dayTagPrefix: 'day:',
  includeIncidentToken: true,
  maxRows: 8,
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
  const relay = input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)[0];
  return relay || null;
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

function parseBoolean(value, fallback) {
  if (typeof value !== 'string') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createSubId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function getNeighborCells(centerHash) {
  const raw = geohash.neighbors(centerHash);
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean);
  return [];
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

function formatDayTokenUtc(date, prefix) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${prefix}${yyyy}${mm}${dd}`;
}

function buildDayTokens(windowDays, prefix) {
  const tokens = [];
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (let i = 0; i < windowDays; i += 1) {
    const date = new Date(todayUtc);
    date.setUTCDate(todayUtc.getUTCDate() - i);
    tokens.push(formatDayTokenUtc(date, prefix));
  }
  return tokens;
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
    : null;
  const incidentId = getTagValue(event.tags, 'd') || event.id;
  const type = String(getTagValue(event.tags, 'type') || content.type || 'unknown');
  const severity = String(getTagValue(event.tags, 'severity') || content.severity || 'unknown');
  const address = String(getTagValue(event.tags, 'address') || content.title || 'n/a');

  return {
    eventId: String(event.id || ''),
    incidentId: String(incidentId || ''),
    createdAtSec,
    occurredAtMs,
    lat,
    lng,
    type,
    severity,
    address,
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

function summarizeBy(values, key) {
  const counts = {};
  for (const value of values) {
    const k = String(value[key] ?? 'unknown');
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

function minMaxAvg(numbers) {
  if (!numbers.length) {
    return { min: NaN, max: NaN, avg: NaN };
  }
  let min = numbers[0];
  let max = numbers[0];
  let sum = 0;
  for (const n of numbers) {
    min = Math.min(min, n);
    max = Math.max(max, n);
    sum += n;
  }
  return { min, max, avg: sum / numbers.length };
}

function formatUtc(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  return new Date(ms).toISOString();
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

    const subId = createSubId('client-filter');
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
        // ignore socket close errors
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
  const radiusMiles = toNumber(args.radiusMiles, DEFAULTS.radiusMiles);
  const windowDays = Math.max(1, toInteger(args.windowDays, DEFAULTS.windowDays));
  const limit = Math.max(1, toInteger(args.limit, DEFAULTS.limit));
  const timeoutMs = Math.max(1000, toInteger(args.timeoutMs, DEFAULTS.timeoutMs));
  const geohashPrecision = Math.max(1, Math.min(12, toInteger(args.geohashPrecision, DEFAULTS.geohashPrecision)));
  const rawGeohashKey = args.geohashKey !== undefined ? String(args.geohashKey) : DEFAULTS.geohashKey;
  const geohashKey =
    rawGeohashKey === 'off' || rawGeohashKey === 'none' || rawGeohashKey === 'false'
      ? ''
      : rawGeohashKey;
  const rawDayTagKey = args.dayTagKey !== undefined ? String(args.dayTagKey) : DEFAULTS.dayTagKey;
  const dayTagKey =
    rawDayTagKey === 'off' || rawDayTagKey === 'none' || rawDayTagKey === 'false'
      ? ''
      : rawDayTagKey;
  const dayTagPrefix =
    args.dayTagPrefix !== undefined
      ? String(args.dayTagPrefix)
      : dayTagKey === 't'
        ? DEFAULTS.dayTagPrefix
        : '';
  const includeIncidentToken = parseBoolean(args.includeIncidentToken, DEFAULTS.includeIncidentToken);
  const typeToken = args.typeToken ? String(args.typeToken) : null;
  const maxRows = Math.max(1, toInteger(args.maxRows, DEFAULTS.maxRows));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error('Missing required coordinates. Use --lat <number> --lng <number>.');
    process.exit(1);
  }

  const centerHash = geohash.encode(lat, lng, geohashPrecision);
  const geohashes = Array.from(new Set([centerHash, ...getNeighborCells(centerHash)].filter(Boolean)));
  const dayTokens = buildDayTokens(windowDays, dayTagPrefix);
  const sinceOccurredMs = Date.now() - windowDays * DAY_MS;
  const radiusMeters = radiusMiles * MILES_TO_METERS;

  const filter = {
    kinds: [KIND_INCIDENT],
    limit,
  };
  if (geohashKey && geohashes.length > 0) {
    filter[`#${geohashKey}`] = geohashes;
  }
  if (dayTagKey) {
    const values = [...dayTokens];
    if (includeIncidentToken && dayTagKey === 't') {
      values.push('incident');
    }
    if (typeToken) {
      values.push(typeToken);
    }
    filter[`#${dayTagKey}`] = Array.from(new Set(values));
  }

  console.log('Client-side incident request probe');
  console.log(`  relay: ${relay}`);
  console.log(`  auth key source: ${source}`);
  console.log(`  center: [${lng}, ${lat}]`);
  console.log(`  radius: ${radiusMiles.toFixed(3)} mi`);
  console.log(`  window: last ${windowDays} day(s) by occurredAt`);
  console.log(`  geohash precision: ${geohashPrecision}`);
  if (geohashKey) {
    console.log(`  geohash filter #${geohashKey}: ${geohashes.join(', ')}`);
  } else {
    console.log('  geohash prefilter: disabled');
  }
  if (dayTagKey) {
    console.log(`  day facet #${dayTagKey}: ${dayTokens.join(', ')}`);
  }
  if (typeToken) {
    console.log(`  type token: ${typeToken}`);
  }
  console.log(`  relay filter: ${JSON.stringify(filter)}`);

  const snapshot = await fetchEvents({
    relay,
    filter,
    timeoutMs,
    secretKey,
  });

  const deduped = dedupeByIncident(snapshot.events);
  const candidates = deduped
    .map((incident) => {
      const meters = distanceMeters(lat, lng, incident.lat, incident.lng);
      return { ...incident, distanceMeters: meters };
    })
    .sort((a, b) => {
      const distanceDelta = a.distanceMeters - b.distanceMeters;
      if (distanceDelta !== 0) return distanceDelta;

      const aOccurred = Number.isFinite(a.occurredAtMs) ? a.occurredAtMs : -Infinity;
      const bOccurred = Number.isFinite(b.occurredAtMs) ? b.occurredAtMs : -Infinity;
      const occurredDelta = bOccurred - aOccurred;
      if (occurredDelta !== 0) return occurredDelta;

      return a.incidentId.localeCompare(b.incidentId);
    });

  const exact = candidates.filter(
    (incident) =>
      Number.isFinite(incident.distanceMeters) &&
      incident.distanceMeters <= radiusMeters &&
      Number.isFinite(incident.occurredAtMs) &&
      incident.occurredAtMs >= sinceOccurredMs
  );

  const distancesKm = exact.map((item) => item.distanceMeters / 1000);
  const occurredAtValues = exact
    .map((item) => item.occurredAtMs)
    .filter((value) => Number.isFinite(value));
  const distanceStats = minMaxAvg(distancesKm);
  const occurredStats = minMaxAvg(occurredAtValues);

  console.log('');
  console.log('Relay snapshot');
  console.log(`  reason: ${snapshot.reason}`);
  console.log(`  auth round-trips: ${snapshot.authCount}`);
  console.log(`  raw events: ${snapshot.events.length}`);
  console.log(`  deduped incidents (by d): ${deduped.length}`);
  if (snapshot.notices.length > 0) {
    console.log(`  notices: ${snapshot.notices.join(' | ')}`);
  }

  console.log('');
  console.log('Client exact filter result');
  console.log(`  incidents within radius + occurredAt window: ${exact.length}`);
  console.log(
    `  distance km min/max/avg: ${Number.isFinite(distanceStats.min) ? distanceStats.min.toFixed(3) : 'n/a'} / ${Number.isFinite(distanceStats.max) ? distanceStats.max.toFixed(3) : 'n/a'} / ${Number.isFinite(distanceStats.avg) ? distanceStats.avg.toFixed(3) : 'n/a'}`
  );
  console.log(
    `  occurredAt UTC range: ${formatUtc(occurredStats.min)} -> ${formatUtc(occurredStats.max)}`
  );
  console.log(`  type breakdown: ${JSON.stringify(summarizeBy(exact, 'type'))}`);
  console.log(`  severity breakdown: ${JSON.stringify(summarizeBy(exact, 'severity'))}`);

  if (exact.length > 0) {
    console.log('');
    console.log(`Nearest ${Math.min(maxRows, exact.length)} incidents`);
    for (const item of exact.slice(0, maxRows)) {
      console.log(
        `  ${item.distanceMeters.toFixed(0)}m | ${item.type} | sev:${item.severity} | occurred:${formatUtc(item.occurredAtMs)} | ${item.address} | event:${item.eventId}`
      );
    }
  }
}

run().catch((error) => {
  console.error('Client-side incident request probe failed:', error);
  process.exit(1);
});
