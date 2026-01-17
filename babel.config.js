module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
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
    ],
  };
};
