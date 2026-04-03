#!/usr/bin/env node

const { SimplePool } = require('nostr-tools');

const DEFAULT_RELAY_URL = 'wss://relay.eventinel.com';
const DEFAULT_INCIDENT_KIND = 30911;
const DEFAULT_FETCH_LIMIT = 400;
const DEFAULT_TIMEOUT_MS = 10_000;

function normalizeRelayUrl(url) {
  const trimmed = String(url).trim();

  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.pathname === '/') {
      return `${parsed.origin}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

function parseArgs(argv) {
  const values = new Map();
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const tokenBody = token.slice(2);
    const separatorIndex = tokenBody.indexOf('=');
    const flag =
      separatorIndex === -1 ? tokenBody : tokenBody.slice(0, separatorIndex);
    const inlineValue =
      separatorIndex === -1 ? undefined : tokenBody.slice(separatorIndex + 1);
    const nextToken = argv[index + 1];
    const value =
      inlineValue !== undefined
        ? inlineValue
        : nextToken && !nextToken.startsWith('--')
          ? (index += 1, nextToken)
          : 'true';

    const existing = values.get(flag) ?? [];
    existing.push(value);
    values.set(flag, existing);
  }

  return { values, positionals };
}

function getFlag(args, name) {
  return args.values.get(name)?.[0];
}

function getNumberFlag(args, name, fallback) {
  const raw = getFlag(args, name);
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --${name} value: ${raw}`);
  }

  return parsed;
}

function getRelayUrls(args) {
  const fromFlags = args.values.get('relay') ?? [];
  const relays = fromFlags
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeRelayUrl);

  if (relays.length > 0) {
    return [...new Set(relays)];
  }

  const envRelays =
    process.env.EXPO_PUBLIC_NOSTR_RELAYS ??
    process.env.NEXT_PUBLIC_NOSTR_RELAYS ??
    DEFAULT_RELAY_URL;

  return [...new Set(envRelays.split(',').map(normalizeRelayUrl).filter(Boolean))];
}

function buildIncidentFilter({ geohash, limit = DEFAULT_FETCH_LIMIT, sinceDays }) {
  const filter = {
    kinds: [DEFAULT_INCIDENT_KIND],
    '#g': [geohash],
    limit,
  };

  if (sinceDays !== undefined) {
    const sinceSeconds = Math.max(
      0,
      Math.floor(Date.now() / 1000) - Math.floor(sinceDays * 86400)
    );
    filter.since = sinceSeconds;
  }

  return filter;
}

async function runIncidentProbe({ relays, filter, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const pool = new SimplePool();
  const closeTimer = setTimeout(() => {
    pool.close(relays);
  }, timeoutMs);

  try {
    const events = await pool.querySync(relays, filter);
    return events;
  } finally {
    clearTimeout(closeTimer);
    pool.close(relays);
  }
}

function getTagValue(tags, tagName) {
  return (tags ?? []).find((tag) => tag[0] === tagName)?.[1];
}

function formatUnixSeconds(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a';
  }

  return `${new Date(value * 1000).toISOString()} (${value})`;
}

function summarizeEvents(events) {
  const sorted = [...events].sort(
    (left, right) => (right.created_at ?? 0) - (left.created_at ?? 0)
  );
  const incidentIds = new Set(
    sorted.map((event) => getTagValue(event.tags, 'd') ?? event.id).filter(Boolean)
  );
  const createdAtValues = sorted
    .map((event) => event.created_at)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

  const newestCreatedAt = createdAtValues.length > 0 ? Math.max(...createdAtValues) : null;
  const oldestCreatedAt = createdAtValues.length > 0 ? Math.min(...createdAtValues) : null;

  return {
    totalEvents: sorted.length,
    uniqueIncidents: incidentIds.size,
    newestCreatedAt,
    oldestCreatedAt,
    sample: sorted.slice(0, 5).map((event) => ({
      id: event.id,
      incidentId: getTagValue(event.tags, 'd') ?? event.id,
      geohash: getTagValue(event.tags, 'g') ?? null,
      createdAt: event.created_at ?? null,
    })),
  };
}

function printProbeReport({ title, relays, filter, summary }) {
  console.log(`\n=== ${title} ===`);
  console.log('Relays:', relays.join(', '));
  console.log('Filter:', JSON.stringify(filter, null, 2));
  console.log('Total events:', summary.totalEvents);
  console.log('Unique incidents:', summary.uniqueIncidents);
  console.log('Newest created_at:', formatUnixSeconds(summary.newestCreatedAt));
  console.log('Oldest created_at:', formatUnixSeconds(summary.oldestCreatedAt));
  console.log('Sample:', JSON.stringify(summary.sample, null, 2));
}

module.exports = {
  DEFAULT_FETCH_LIMIT,
  DEFAULT_RELAY_URL,
  DEFAULT_TIMEOUT_MS,
  buildIncidentFilter,
  formatUnixSeconds,
  getFlag,
  getNumberFlag,
  getRelayUrls,
  parseArgs,
  printProbeReport,
  runIncidentProbe,
  summarizeEvents,
};
