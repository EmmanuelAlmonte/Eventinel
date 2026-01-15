import 'react-native-get-random-values'; // MUST be first import!
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@rneui/themed';
import { useNDKInit, useSessionMonitor, useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import MenuScreen from './screens/MenuScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import LoginScreen from './screens/LoginScreen';
import { ndk } from './lib/ndk';
import { loadRelays } from './lib/relay/storage';
import { theme } from './lib/theme';
import { PRIMARY, NEUTRAL } from './lib/brand/colors';

const Tab = createMaterialTopTabNavigator();

/**
 * Eventinel Mobile App
 *
 * Loads saved relays on startup and connects to them.
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const initializeNDK = useNDKInit(); // Initialize all 4 stores (NDK, sessions, profiles, mutes)
  const currentUser = useNDKCurrentUser(); // Check auth state

  // Initialize NDK and all dependent stores (sessions, profiles, mutes)
  // This MUST run before useSessionMonitor can work properly
  useEffect(() => {
    console.log('🔧 [App] Initializing NDK and all stores...');
    initializeNDK(ndk);
    console.log('✅ [App] NDK and stores initialized');
  }, [initializeNDK]);

  // Enable automatic session persistence to SecureStore
  // This hook:
  // - Loads saved sessions from SecureStore on startup
  // - Restores signers via ndkSignerFromPayload
  // - Persists new sessions when added via initSession/login
  // - Handles legacy nsec1 migration automatically
  // NOTE: Safely handles null NDK on first render, processes after initialization
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
    return (
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <StatusBar style="light" />
          <LoginScreen />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            initialRouteName="Menu"
            tabBarPosition="bottom"
            screenOptions={{
              tabBarActiveTintColor: PRIMARY.DEFAULT,
              tabBarInactiveTintColor: NEUTRAL.textMuted,
              tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
              tabBarStyle: {
                backgroundColor: NEUTRAL.dark,
                height: 60,
                paddingBottom: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: NEUTRAL.darkBorder,
              },
              tabBarIndicatorStyle: {
                backgroundColor: PRIMARY.DEFAULT,
                height: 3,
                top: 0,
              },
              swipeEnabled: false,
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
