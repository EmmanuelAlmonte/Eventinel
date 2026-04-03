type AppEnv = 'development' | 'staging' | 'preview' | 'production';

function parseOptionalBoolFlag(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value == null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return defaultValue;
}

function resolveAppEnv(): AppEnv {
  const configuredEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();

  switch (configuredEnv) {
    case 'development':
    case 'staging':
    case 'preview':
    case 'production':
      return configuredEnv;
    default:
      return __DEV__ ? 'development' : 'production';
  }
}

const appEnv = resolveAppEnv();
const isProd = appEnv === 'production';
const isDevLike = !isProd;

export const buildFlags = {
  appEnv,
  isProd,
  isDevLike,
  showDebugUI: isDevLike && parseOptionalBoolFlag(process.env.EXPO_PUBLIC_ENABLE_DEBUG_UI, __DEV__),
  enableProtocolDebug:
    isDevLike && parseOptionalBoolFlag(process.env.EXPO_PUBLIC_ENABLE_PROTOCOL_DEBUG, __DEV__),
  enableVerboseLogs:
    isDevLike && parseOptionalBoolFlag(process.env.EXPO_PUBLIC_ENABLE_VERBOSE_LOGS, __DEV__),
} as const;

