module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [
    // Strip console logs from production bundles so logs are dev-only.
    isProduction ? 'transform-remove-console' : null,
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@components': './components',
          '@contexts': './contexts',
          '@screens': './screens',
          '@hooks': './hooks',
          '@lib': './lib',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    'react-native-reanimated/plugin', // Must be last
  ].filter(Boolean);

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
