const path = require('path');

const appConfigPath = path.resolve(__dirname, '../app.config.js');
const appConfigModulePath = require.resolve(appConfigPath);

const ENV_KEYS = [
  'DOTENV_PATH',
  'EVENTINEL_ANDROID_USES_CLEARTEXT_TRAFFIC',
  'EVENTINEL_BLOSSOM_SERVERS',
  'EXPO_PUBLIC_EVENTINEL_BLOSSOM_SERVERS',
  'MAPBOX_ACCESS_TOKEN',
];

function loadAppConfig(env = {}) {
  const previousEnv = {};
  for (const key of ENV_KEYS) {
    previousEnv[key] = process.env[key];
    delete process.env[key];
  }

  Object.assign(process.env, {
    DOTENV_PATH: path.resolve(__dirname, '../__fixtures__/missing.env'),
    MAPBOX_ACCESS_TOKEN: 'pk.test-token',
    ...env,
  });

  jest.resetModules();
  delete require.cache[appConfigModulePath];

  try {
    return require(appConfigPath);
  } finally {
    for (const key of ENV_KEYS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  }
}

function getAndroidBuildProperties(config) {
  return config.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties')[1]
    .android;
}

describe('app.config Blossom cleartext policy', () => {
  it('enables Android cleartext traffic for JSON-array Blossom HTTP servers', () => {
    const config = loadAppConfig({
      EVENTINEL_BLOSSOM_SERVERS: JSON.stringify(['https://cdn.example.com', 'http://10.0.2.2:3000/path']),
    });

    expect(getAndroidBuildProperties(config).usesCleartextTraffic).toBe(true);
  });

  it('enables Android cleartext traffic for newline-delimited Blossom HTTP servers', () => {
    const config = loadAppConfig({
      EVENTINEL_BLOSSOM_SERVERS: 'https://cdn.example.com\nhttp://10.0.2.2:3000',
    });

    expect(getAndroidBuildProperties(config).usesCleartextTraffic).toBe(true);
  });

  it('keeps Android cleartext traffic disabled for HTTPS-only Blossom servers', () => {
    const config = loadAppConfig({
      EVENTINEL_BLOSSOM_SERVERS: JSON.stringify(['https://cdn.example.com', 'https://upload.example.com']),
    });

    expect(getAndroidBuildProperties(config).usesCleartextTraffic).toBe(false);
  });

  it('lets explicit Android cleartext configuration override Blossom server detection', () => {
    const config = loadAppConfig({
      EVENTINEL_ANDROID_USES_CLEARTEXT_TRAFFIC: 'false',
      EVENTINEL_BLOSSOM_SERVERS: 'http://10.0.2.2:3000',
    });

    expect(getAndroidBuildProperties(config).usesCleartextTraffic).toBe(false);
  });
});
