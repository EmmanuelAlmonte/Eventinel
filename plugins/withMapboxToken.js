/**
 * Expo Config Plugin: withMapboxToken
 *
 * Handles Mapbox access token configuration for both platforms:
 * - Android: Creates mapbox_access_token.xml resource file
 * - iOS: Adds MBXAccessToken to Info.plist
 *
 * Usage in app.config.js:
 *   plugins: [
 *     ['./plugins/withMapboxToken', process.env.MAPBOX_ACCESS_TOKEN],
 *   ]
 */

const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withMapboxTokenAndroid(config, token) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'values'
      );

      // Ensure the values directory exists
      if (!fs.existsSync(resPath)) {
        fs.mkdirSync(resPath, { recursive: true });
      }

      const tokenFilePath = path.join(resPath, 'mapbox_access_token.xml');
      const tokenFileContent = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
    <string name="mapbox_access_token" translatable="false" tools:ignore="UnusedResources">${token}</string>
</resources>
`;

      fs.writeFileSync(tokenFilePath, tokenFileContent);
      console.log('✅ [withMapboxToken] Created mapbox_access_token.xml (Android)');

      return config;
    },
  ]);
}

function withMapboxTokenIOS(config, token) {
  return withInfoPlist(config, (config) => {
    config.modResults.MBXAccessToken = token;
    console.log('✅ [withMapboxToken] Added MBXAccessToken to Info.plist (iOS)');
    return config;
  });
}

function withMapboxToken(config, token) {
  if (!token) {
    console.warn('⚠️  [withMapboxToken] No Mapbox token provided, skipping...');
    return config;
  }

  // Apply both platform modifications
  config = withMapboxTokenAndroid(config, token);
  config = withMapboxTokenIOS(config, token);

  return config;
}

module.exports = withMapboxToken;
