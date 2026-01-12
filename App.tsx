import 'react-native-get-random-values'; // MUST be first import!
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import NDK from '@nostr-dev-kit/ndk-mobile';
import { NDKProvider } from '@nostr-dev-kit/ndk-mobile';
import { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';

import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createMaterialTopTabNavigator();

// Initialize NDK with SQLite cache
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
  ],
  cacheAdapter: new NDKCacheAdapterSqlite('eventinel.db'),
});

// Connect to relays
ndk.connect().catch((err) => console.error('NDK connect error:', err));

/**
 * Eventinel Mobile App
 *
 * Simple, direct NDK integration - no shared hooks complexity
 */
export default function App() {
  return (
    <NDKProvider ndk={ndk}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#6b7280',
            tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
            tabBarStyle: { backgroundColor: '#fff' },
            tabBarIndicatorStyle: { backgroundColor: '#2563eb' },
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </NDKProvider>
  );
}
