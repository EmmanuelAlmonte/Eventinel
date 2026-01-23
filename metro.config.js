const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Often needed when deps ship .cjs files
config.resolver.sourceExts.push('cjs');

// Alias: Map @nostr-dev-kit/mobile to @nostr-dev-kit/ndk-mobile
// This lets us use stable packages without changing import statements
config.resolver.extraNodeModules = {
  '@nostr-dev-kit/mobile': path.resolve(__dirname, 'node_modules/@nostr-dev-kit/ndk-mobile'),
};

module.exports = config;
