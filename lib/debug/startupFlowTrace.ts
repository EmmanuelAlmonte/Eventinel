type StartupFlowMeta = Record<string, unknown> | undefined;

const DEBUG_STARTUP_FLOW =
  __DEV__ && process.env.EXPO_PUBLIC_DEBUG_STARTUP_FLOW === '1';

function nowIso(): string {
  return new Date().toISOString();
}

function stringifyMeta(meta: StartupFlowMeta): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    return ` meta=${JSON.stringify(meta)}`;
  } catch {
    return ' meta=<unserializable>';
  }
}

export function logStartupFlow(stage: string, meta?: Record<string, unknown>): void {
  if (!DEBUG_STARTUP_FLOW) {
    return;
  }

  console.log(`[StartupFlow] ${stage} t=${nowIso()}${stringifyMeta(meta)}`);
}
