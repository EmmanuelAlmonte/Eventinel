import 'react-native-get-random-values'; // MUST be first import!
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import MenuScreen from './screens/MenuScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import PrivateKeyScreen from './screens/PrivateKeyScreen';

// NDK is initialized in lib/ndk.ts (singleton pattern)
// Screens import directly from there to avoid circular dependencies

const Tab = createMaterialTopTabNavigator();

/**
 * Eventinel Mobile App
 *
 * NDK initialization is in lib/ndk.ts to avoid circular dependencies.
 * Screens import { ndk } from '../lib/ndk' directly.
 */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        initialRouteName="Menu"
        tabBarPosition="bottom"
        screenOptions={{
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarStyle: {
            backgroundColor: '#fff',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#2563eb',
            height: 3,
            top: 0,
          },
          swipeEnabled: false, // Disable swipe, force tap navigation
        }}
      >
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          options={{ tabBarLabel: '🏠 Home' }}
        />
        <Tab.Screen
          name="Relays"
          component={RelayConnectScreen}
          options={{ tabBarLabel: '🌐 Relays' }}
        />
        <Tab.Screen
          name="Key"
          component={PrivateKeyScreen}
          options={{ tabBarLabel: '🔑 Key' }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{ tabBarLabel: '🗺️ Map' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: '👤 Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
