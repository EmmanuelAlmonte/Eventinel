const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Often needed when deps ship .cjs files
config.resolver.sourceExts.push('cjs');

// Avoid package-exports warnings for @noble/hashes/crypto.js by rewriting to the
// exported subpath. This keeps Metro on the normal resolver path.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js') {
    moduleName = '@noble/hashes/crypto';
  }

  const resolver = defaultResolveRequest ?? context.resolveRequest;
  return resolver(context, moduleName, platform);
};

module.exports = config;
