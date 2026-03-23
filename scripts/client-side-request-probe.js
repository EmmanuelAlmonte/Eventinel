#!/usr/bin/env node

const {
  DEFAULT_FETCH_LIMIT,
  DEFAULT_TIMEOUT_MS,
  buildIncidentFilter,
  getFlag,
  getNumberFlag,
  getRelayUrls,
  parseArgs,
  printProbeReport,
  runIncidentProbe,
  summarizeEvents,
} = require('./incident-probe-utils');

function printUsage() {
  console.log(
    [
      'Usage: node scripts/client-side-request-probe.js --geohash <hash> [options]',
      '',
      'Options:',
      '  --relay <url>       Repeatable or comma-separated relay list',
      `  --limit <number>    Event limit (default: ${DEFAULT_FETCH_LIMIT})`,
      '  --sinceDays <days>  Optional freshness window in days',
      `  --timeoutMs <ms>    Probe timeout (default: ${DEFAULT_TIMEOUT_MS})`,
    ].join('\n')
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const geohash = getFlag(args, 'geohash');

  if (!geohash || geohash === 'true') {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const relays = getRelayUrls(args);
  const limit = getNumberFlag(args, 'limit', DEFAULT_FETCH_LIMIT);
  const sinceDaysRaw = getFlag(args, 'sinceDays');
  const sinceDays =
    sinceDaysRaw === undefined ? undefined : getNumberFlag(args, 'sinceDays', undefined);
  const timeoutMs = getNumberFlag(args, 'timeoutMs', DEFAULT_TIMEOUT_MS);

  const filter = buildIncidentFilter({
    geohash,
    limit,
    sinceDays,
  });
  const events = await runIncidentProbe({ relays, filter, timeoutMs });
  const summary = summarizeEvents(events);

  printProbeReport({
    title: 'Client-side incident request probe',
    relays,
    filter,
    summary,
  });
}

main().catch((error) => {
  console.error('[probe:client:incident] Failed:', error);
  process.exitCode = 1;
});
