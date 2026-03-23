#!/usr/bin/env node

const ngeohash = require('ngeohash');

const {
  DEFAULT_FETCH_LIMIT,
  DEFAULT_TIMEOUT_MS,
  buildIncidentFilter,
  formatUnixSeconds,
  getNumberFlag,
  getRelayUrls,
  parseArgs,
  printProbeReport,
  runIncidentProbe,
  summarizeEvents,
} = require('./incident-probe-utils');

const DEFAULT_GEOHASH_PRECISION = 6;
const DEFAULT_SINCE_DAYS = 30;

function printUsage() {
  console.log(
    [
      'Usage: node scripts/single-geohash-precision-probe.js --lat <value> --lng <value> [options]',
      '',
      'Options:',
      `  --precision <n>     Geohash precision (default: ${DEFAULT_GEOHASH_PRECISION})`,
      `  --limit <number>    Event limit (default: ${DEFAULT_FETCH_LIMIT})`,
      `  --sinceDays <days>  Candidate freshness window (default: ${DEFAULT_SINCE_DAYS})`,
      `  --timeoutMs <ms>    Probe timeout (default: ${DEFAULT_TIMEOUT_MS})`,
      '  --relay <url>       Repeatable or comma-separated relay list',
    ].join('\n')
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const lat = getNumberFlag(args, 'lat', NaN);
  const lng = getNumberFlag(args, 'lng', NaN);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const precision = getNumberFlag(args, 'precision', DEFAULT_GEOHASH_PRECISION);
  const limit = getNumberFlag(args, 'limit', DEFAULT_FETCH_LIMIT);
  const sinceDays = getNumberFlag(args, 'sinceDays', DEFAULT_SINCE_DAYS);
  const timeoutMs = getNumberFlag(args, 'timeoutMs', DEFAULT_TIMEOUT_MS);
  const relays = getRelayUrls(args);
  const geohash = ngeohash.encode(lat, lng, precision);

  console.log(`Computed geohash (${precision}): ${geohash}`);

  const baselineFilter = buildIncidentFilter({
    geohash,
    limit,
  });
  const candidateFilter = buildIncidentFilter({
    geohash,
    limit,
    sinceDays,
  });

  const baselineEvents = await runIncidentProbe({
    relays,
    filter: baselineFilter,
    timeoutMs,
  });
  const candidateEvents = await runIncidentProbe({
    relays,
    filter: candidateFilter,
    timeoutMs,
  });

  const baselineSummary = summarizeEvents(baselineEvents);
  const candidateSummary = summarizeEvents(candidateEvents);

  printProbeReport({
    title: 'Baseline: no since filter',
    relays,
    filter: baselineFilter,
    summary: baselineSummary,
  });
  printProbeReport({
    title: `Candidate: sinceDays=${sinceDays}`,
    relays,
    filter: candidateFilter,
    summary: candidateSummary,
  });

  console.log('\n=== Delta ===');
  console.log('Event delta:', candidateSummary.totalEvents - baselineSummary.totalEvents);
  console.log(
    'Oldest baseline created_at:',
    formatUnixSeconds(baselineSummary.oldestCreatedAt)
  );
  console.log(
    'Oldest candidate created_at:',
    formatUnixSeconds(candidateSummary.oldestCreatedAt)
  );
}

main().catch((error) => {
  console.error('[probe:geohash:single] Failed:', error);
  process.exitCode = 1;
});
