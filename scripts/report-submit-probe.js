#!/usr/bin/env node

const {
  DEFAULT_TIMEOUT_MS,
  getFlag,
  getNumberFlag,
  parseArgs,
  runIncidentProbe,
} = require('./incident-probe-utils');

const REPORT_INCIDENT_KIND = 30911;
const DEFAULT_REPORT_LIMIT = 25;
const DEFAULT_LOCAL_PROBE_RELAY = 'ws://127.0.0.1:8085';

function normalizeRelayUrl(url) {
  return String(url).trim().replace(/\/$/, '');
}

function getProbeRelayUrls(args) {
  const fromFlags = args.values.get('relay') ?? [];
  const relays = fromFlags
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeRelayUrl);

  if (relays.length > 0) {
    return [...new Set(relays)];
  }

  const fallbackRelay =
    process.env.EVENTINEL_LOCAL_RELAY_PROBE_URL ??
    process.env.LOCAL_RELAY_PROBE_URL ??
    DEFAULT_LOCAL_PROBE_RELAY;

  return [normalizeRelayUrl(fallbackRelay)];
}

function getTagValue(tags, tagName) {
  return (tags ?? []).find((tag) => tag[0] === tagName)?.[1] ?? null;
}

function parseEventContent(event) {
  try {
    return JSON.parse(event.content ?? '{}');
  } catch {
    return {};
  }
}

function buildReportSubmitFilter({ author, sinceSeconds, limit }) {
  const filter = {
    kinds: [REPORT_INCIDENT_KIND],
    limit,
  };

  if (author) {
    filter.authors = [author];
  }

  if (typeof sinceSeconds === 'number' && Number.isFinite(sinceSeconds)) {
    filter.since = sinceSeconds;
  }

  return filter;
}

function matchesContains(event, needle) {
  if (!needle) {
    return true;
  }

  const normalizedNeedle = String(needle).trim().toLowerCase();
  if (!normalizedNeedle) {
    return true;
  }

  const content = parseEventContent(event);
  const haystacks = [
    event.id,
    getTagValue(event.tags, 'd'),
    getTagValue(event.tags, 'address'),
    getTagValue(event.tags, 'type'),
    content.title,
    content.description,
    content.sourceId,
    JSON.stringify(content.metadata ?? {}),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return haystacks.some((value) => value.includes(normalizedNeedle));
}

function buildReportSubmitSummary(events) {
  return [...events]
    .sort((left, right) => (right.created_at ?? 0) - (left.created_at ?? 0))
    .map((event) => {
      const content = parseEventContent(event);
      return {
        id: event.id,
        incidentId: getTagValue(event.tags, 'd'),
        createdAt: event.created_at ?? null,
        type: getTagValue(event.tags, 'type'),
        address: getTagValue(event.tags, 'address'),
        title: content.title ?? null,
        description: content.description ?? null,
        sourceId: content.sourceId ?? null,
      };
    });
}

function formatUnixSeconds(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a';
  }

  return `${new Date(value * 1000).toISOString()} (${value})`;
}

function printUsage() {
  console.log(
    [
      'Usage: node scripts/report-submit-probe.js [options]',
      '',
      'Options:',
      '  --relay <url>         Repeatable or comma-separated relay list',
      '  --author <pubkey>     Optional author pubkey filter',
      '  --contains <text>     Optional substring to match in title/description/address',
      '  --sinceSeconds <sec>  Optional absolute unix timestamp lower bound',
      '  --sinceMinutes <min>  Optional relative freshness window in minutes',
      `  --limit <number>      Event limit (default: ${DEFAULT_REPORT_LIMIT})`,
      `  --timeoutMs <ms>      Probe timeout (default: ${DEFAULT_TIMEOUT_MS})`,
      '',
      'Default relay: ws://127.0.0.1:8085',
    ].join('\n')
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (getFlag(args, 'help') === 'true') {
    printUsage();
    return;
  }

  const relays = getProbeRelayUrls(args);
  const author = getFlag(args, 'author');
  const contains = getFlag(args, 'contains');
  const limit = getNumberFlag(args, 'limit', DEFAULT_REPORT_LIMIT);
  const timeoutMs = getNumberFlag(args, 'timeoutMs', DEFAULT_TIMEOUT_MS);
  const sinceSecondsFlag = getFlag(args, 'sinceSeconds');
  const sinceMinutesFlag = getFlag(args, 'sinceMinutes');

  const sinceSeconds =
    sinceSecondsFlag !== undefined
      ? getNumberFlag(args, 'sinceSeconds', undefined)
      : sinceMinutesFlag !== undefined
        ? Math.max(
            0,
            Math.floor(Date.now() / 1000) - Math.floor(getNumberFlag(args, 'sinceMinutes', undefined) * 60)
          )
        : undefined;

  const filter = buildReportSubmitFilter({
    author,
    sinceSeconds,
    limit,
  });

  const events = await runIncidentProbe({ relays, filter, timeoutMs });
  const matchingEvents = events.filter((event) => matchesContains(event, contains));
  const summary = buildReportSubmitSummary(matchingEvents);

  console.log('\n=== Report submit probe ===');
  console.log('Relays:', relays.join(', '));
  console.log('Filter:', JSON.stringify(filter, null, 2));
  if (contains) {
    console.log('Contains:', contains);
  }
  console.log('Matched reports:', summary.length);

  if (summary.length === 0) {
    console.log('No matching report incidents found.');
    process.exitCode = 2;
    return;
  }

  for (const report of summary.slice(0, 5)) {
    console.log('\n---');
    console.log('Incident ID:', report.incidentId ?? 'n/a');
    console.log('Event ID:', report.id ?? 'n/a');
    console.log('Created:', formatUnixSeconds(report.createdAt));
    console.log('Type:', report.type ?? 'n/a');
    console.log('Address:', report.address ?? 'n/a');
    console.log('Title:', report.title ?? 'n/a');
    console.log('Description:', report.description ?? 'n/a');
    console.log('Source ID:', report.sourceId ?? 'n/a');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[probe:report:submit] Failed:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_LOCAL_PROBE_RELAY,
  DEFAULT_REPORT_LIMIT,
  REPORT_INCIDENT_KIND,
  buildReportSubmitFilter,
  buildReportSubmitSummary,
  getProbeRelayUrls,
  matchesContains,
};
