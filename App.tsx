import 'react-native-get-random-values'; // MUST be first import!
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { theme, useAppTheme } from './lib/theme';

const Tab = createBottomTabNavigator();

/**
 * Main Navigation with theme-aware tab bar
 */
function MainNavigation() {
  const { colors, isDark } = useAppTheme();

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        initialRouteName="Map"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarStyle: {
            backgroundColor: colors.background,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Relays"
          component={RelayConnectScreen}
          options={{
            tabBarLabel: "Relays",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>🌐</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarLabel: "Map",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>🗺️</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

/**
 * Login wrapper with theme-aware status bar
 */
function LoginWrapper() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LoginScreen />
    </>
  );
}

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
          <LoginWrapper />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <MainNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
