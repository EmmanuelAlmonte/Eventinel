type IncidentNavSource = 'map-marker' | 'incident-feed' | 'unknown';

type IncidentNavTrace = {
  key: string;
  incidentId: string;
  eventId?: string;
  source: IncidentNavSource;
  startedAtMs: number;
};

type IncidentNavMeta = Record<string, unknown> | undefined;

const DEBUG_INCIDENT_NAV_FLOW =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_INCIDENT_NAV_FLOW === '1';
const TRACE_TTL_MS = 60_000;
const traces = new Map<string, IncidentNavTrace>();

function nowIso(): string {
  return new Date().toISOString();
}

function cleanupStaleTraces(nowMs: number): void {
  for (const [key, trace] of traces) {
    if (nowMs - trace.startedAtMs > TRACE_TTL_MS) {
      traces.delete(key);
    }
  }
}

function buildTraceKey(incidentId: string, eventId?: string): string {
  return eventId ? `${incidentId}:${eventId}` : incidentId;
}

function stringifyMeta(meta: IncidentNavMeta): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    return ` meta=${JSON.stringify(meta)}`;
  } catch {
    return ' meta=<unserializable>';
  }
}

function logFlow(message: string): void {
  if (!DEBUG_INCIDENT_NAV_FLOW) {
    return;
  }
  console.log(`[IncidentNavFlow] ${message}`);
}

function getOrCreateTrace(params: {
  incidentId: string;
  eventId?: string;
  source?: IncidentNavSource;
}): IncidentNavTrace {
  const nowMs = Date.now();
  cleanupStaleTraces(nowMs);
  const key = buildTraceKey(params.incidentId, params.eventId);
  const existing = traces.get(key);
  if (existing) {
    return existing;
  }

  const nextTrace: IncidentNavTrace = {
    key,
    incidentId: params.incidentId,
    eventId: params.eventId,
    source: params.source ?? 'unknown',
    startedAtMs: nowMs,
  };
  traces.set(key, nextTrace);
  return nextTrace;
}

export function logIncidentNavFlow(
  stage: string,
  meta?: Record<string, unknown>
): void {
  if (!DEBUG_INCIDENT_NAV_FLOW) {
    return;
  }
  logFlow(`${stage} t=${nowIso()}${stringifyMeta(meta)}`);
}

export function startIncidentNavTrace(params: {
  incidentId: string;
  eventId?: string;
  source: IncidentNavSource;
  stage: string;
  meta?: Record<string, unknown>;
}): void {
  const trace = getOrCreateTrace(params);
  trace.source = params.source;
  const nowMs = Date.now();
  const elapsedMs = nowMs - trace.startedAtMs;
  logFlow(
    `${params.stage} key=${trace.key} source=${trace.source} elapsed=${elapsedMs}ms t=${nowIso()}${stringifyMeta(
      params.meta
    )}`
  );
}

export function markIncidentNavTrace(params: {
  incidentId: string;
  eventId?: string;
  source?: IncidentNavSource;
  stage: string;
  meta?: Record<string, unknown>;
}): void {
  const trace = getOrCreateTrace(params);
  if (params.source) {
    trace.source = params.source;
  }

  const nowMs = Date.now();
  const elapsedMs = nowMs - trace.startedAtMs;
  logFlow(
    `${params.stage} key=${trace.key} source=${trace.source} elapsed=${elapsedMs}ms t=${nowIso()}${stringifyMeta(
      params.meta
    )}`
  );
}

export function completeIncidentNavTrace(params: {
  incidentId: string;
  eventId?: string;
  stage: string;
  meta?: Record<string, unknown>;
}): void {
  const key = buildTraceKey(params.incidentId, params.eventId);
  const trace = traces.get(key);
  if (!trace) {
    return;
  }

  const nowMs = Date.now();
  const elapsedMs = nowMs - trace.startedAtMs;
  logFlow(
    `${params.stage} key=${trace.key} source=${trace.source} elapsed=${elapsedMs}ms t=${nowIso()}${stringifyMeta(
      params.meta
    )}`
  );
  traces.delete(key);
}
