/**
 * Expo Config Plugin: withMapboxToken
 *
 * Automatically creates the mapbox_access_token.xml Android resource file
 * during `expo prebuild`. This is required because the @rnmapbox/maps plugin
 * doesn't create this file automatically.
 *
 * Usage in app.config.js:
 *   plugins: [
 *     ['./plugins/withMapboxToken', process.env.MAPBOX_ACCESS_TOKEN],
 *   ]
 */

const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withMapboxToken(config, token) {
  if (!token) {
    console.warn('⚠️  [withMapboxToken] No Mapbox token provided, skipping...');
    return config;
  }

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
      console.log('✅ [withMapboxToken] Created mapbox_access_token.xml');

      return config;
    },
  ]);
}

module.exports = withMapboxToken;
