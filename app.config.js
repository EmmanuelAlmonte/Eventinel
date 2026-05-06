// Read environment variables from .env.local (dev) or .env (production)
const fs = require('fs');
const path = require('path');

function resolveEnvPath() {
  if (process.env.DOTENV_PATH) {
    return process.env.DOTENV_PATH;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const candidates = isProd
    ? ['.env', '.env.local']
    : ['.env.local', '.env'];

  for (const filename of candidates) {
    const fullPath = path.join(__dirname, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return path.join(__dirname, isProd ? '.env' : '.env.local');
}

require('dotenv').config({ path: resolveEnvPath() });

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function splitListValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitListValue(item));
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => splitListValue(item));
      }
    } catch {
      // Fall back to delimiter parsing below.
    }
  }

  return trimmed
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBlossomServerUrl(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeBlossomServerUrls(value) {
  const seen = new Set();
  const urls = [];

  for (const item of splitListValue(value)) {
    const normalized = normalizeBlossomServerUrl(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

// Debug: Verify token is loaded
const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
if (!mapboxToken) {
  console.warn('⚠️  WARNING: MAPBOX_ACCESS_TOKEN not found in .env.local!');
} else {
  console.log(`✅ Mapbox token loaded: ${mapboxToken.substring(0, 15)}...`);
}

const blossomServers =
  process.env.EVENTINEL_BLOSSOM_SERVERS ?? process.env.EXPO_PUBLIC_EVENTINEL_BLOSSOM_SERVERS ?? '';
const hasCleartextBlossomServer = normalizeBlossomServerUrls(blossomServers).some((server) =>
  server.toLowerCase().startsWith('http://')
);
const usesCleartextTraffic = parseBoolean(
  process.env.EVENTINEL_ANDROID_USES_CLEARTEXT_TRAFFIC,
  hasCleartextBlossomServer
);
const googleServicesFile = path.join(__dirname, 'google-services.json');

module.exports = {
  expo: {
    name: 'Eventinel',
    slug: 'eventinel-zu26kq3j5yws6enmbulrx',
    version: '1.0.0',
    scheme: 'eventinel',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    jsEngine: 'hermes',
    newArchEnabled: true,
    plugins: [
      [
        'expo-dev-client',
        {
          launchMode: 'most-recent',
        },
      ],
      'expo-secure-store',
      'expo-image-picker',
      [
        'expo-location',
        {
          // Foreground service: Allows location while app is minimized (notification tray)
          // Required for: reliable emulator GPS, real-time alerts when backgrounded
          // Permissions added: FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION
          isAndroidForegroundServiceEnabled: true,

          // Background location: Allows location when app is CLOSED (requires Play Store review)
          // Enable later if needed for: geofence alerts, passive incident tracking
          // Permissions added: ACCESS_BACKGROUND_LOCATION
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-notifications',
        {
          defaultChannel: 'incidents',
        },
      ],
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
        },
      ],
      // Custom plugin to create mapbox_access_token.xml (required for Android native SDK)
      ['./plugins/withMapboxToken', process.env.MAPBOX_ACCESS_TOKEN],
      'expo-sqlite',
      [
        'expo-build-properties',
        {
          android: {
            gradleVersion: '8.10',
            kotlinVersion: '2.0.21',
            usesCleartextTraffic,
          },
        },
      ],
      'expo-asset',
    ],
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.eventinel.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'Eventinel needs your location to show nearby safety incidents on the map.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Eventinel can track your location in the background to provide real-time incident alerts and continuous map updates even when the app is closed.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.eventinel.app',
      ...(fs.existsSync(googleServicesFile) ? { googleServicesFile: './google-services.json' } : {}),
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '095741fd-0726-4560-9b50-528a8e167252',
      },
      // Blossom media configuration. Values are public client policy only; no secrets.
      EVENTINEL_BLOSSOM_SERVERS: blossomServers,
      EVENTINEL_BLOSSOM_IMAGE_MIME_TYPES: process.env.EVENTINEL_BLOSSOM_IMAGE_MIME_TYPES,
      EVENTINEL_BLOSSOM_VIDEO_ENABLED: process.env.EVENTINEL_BLOSSOM_VIDEO_ENABLED,
      EVENTINEL_BLOSSOM_VIDEO_MIME_TYPES: process.env.EVENTINEL_BLOSSOM_VIDEO_MIME_TYPES,
      EVENTINEL_BLOSSOM_MAX_BYTES: process.env.EVENTINEL_BLOSSOM_MAX_BYTES,
      EVENTINEL_BLOSSOM_USE_MEDIA_ENDPOINT: process.env.EVENTINEL_BLOSSOM_USE_MEDIA_ENDPOINT,
      EVENTINEL_BLOSSOM_MIRROR_ENABLED: process.env.EVENTINEL_BLOSSOM_MIRROR_ENABLED,
    },
  },
};
