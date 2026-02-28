import 'react-native-get-random-values';

if (!__DEV__) {
  const noop = () => {};
  // Trim verbose logs in production while keeping warnings/errors.
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
