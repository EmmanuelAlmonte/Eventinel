// Read environment variables from .env.local
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Debug: Verify token is loaded
const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
if (!mapboxToken) {
  console.warn('⚠️  WARNING: MAPBOX_ACCESS_TOKEN not found in .env.local!');
} else {
  console.log(`✅ Mapbox token loaded: ${mapboxToken.substring(0, 15)}...`);
}

module.exports = {
  expo: {
    name: 'Eventinel',
    slug: 'eventinel',
    version: '1.0.0',
    scheme: 'eventinel',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    jsEngine: 'hermes',
    developmentClient: {
      silentLaunch: true,
    },
    newArchEnabled: true,
    plugins: [
      'expo-secure-store',
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
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '1a58dec9-3386-4d0f-822e-48bf0ee5a852',
      },
    },
  },
};
