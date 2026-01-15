import 'react-native-get-random-values'; // MUST be first import!
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNDKStore, useSessionMonitor, useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import MenuScreen from './screens/MenuScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import LoginScreen from './screens/LoginScreen';
import { ndk } from './lib/ndk';
import { loadRelays } from './lib/relay/storage';

// Register NDK singleton with Zustand store SYNCHRONOUSLY at module level
// This MUST happen before any React components render, because useSessionMonitor
// needs the NDK instance immediately when the component mounts.
// Moving this from useEffect fixes the race condition:
// "NDK instance not initialized in session store"
useNDKStore.getState().setNDK(ndk);
console.log('🔧 [App] NDK registered with store (module level)');

const Tab = createMaterialTopTabNavigator();

/**
 * Eventinel Mobile App
 *
 * Loads saved relays on startup and connects to them.
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const currentUser = useNDKCurrentUser(); // Check auth state

  // Enable automatic session persistence to SecureStore
  // This hook:
  // - Loads saved sessions from SecureStore on startup
  // - Restores signers via ndkSignerFromPayload
  // - Persists new sessions when added via initSession/login
  // - Handles legacy nsec1 migration automatically
  useSessionMonitor({
    profile: true, // Auto-fetch profiles for restored sessions
  });

  useEffect(() => {
    async function initializeRelays() {
      try {
        console.log('🚀 [App] Initializing relay connections...');

        // Load saved relays from storage
        const savedRelays = await loadRelays();
        console.log('📥 [App] Loaded', savedRelays.length, 'saved relays:', savedRelays);

        if (savedRelays.length === 0) {
          console.warn('⚠️ [App] No saved relays found. Add relays in the Relays tab.');
        }

        // Add them to NDK pool
        for (const url of savedRelays) {
          console.log('➕ [App] Adding relay to pool:', url);
          ndk.addExplicitRelay(url);
        }

        // Start connecting (don't wait - let it happen in background)
        ndk.connect().catch((err) => console.warn('⚠️ [App] Relay connection warning:', err));
        console.log('🔄 [App] Started relay connections in background');

        // Don't wait for connections - show UI immediately
        setIsReady(true);
        console.log('✅ [App] UI ready, relays connecting...');
      } catch (error) {
        console.error('❌ [App] Failed to initialize relays:', error);
        setIsReady(true); // Continue anyway
      }
    }

    initializeRelays();
  }, []);

  if (!isReady) {
    // You can add a loading spinner here
    return null;
  }

  // Show LoginScreen if not authenticated
  if (!currentUser) {
    return <LoginScreen />;
  }

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
