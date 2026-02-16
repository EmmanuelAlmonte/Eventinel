import 'react-native-get-random-values'; // MUST be first import!
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, Text as RNEText } from '@rneui/themed';
import { useNDKInit, useSessionMonitor, useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import MapScreen from './screens/MapScreen';
import IncidentFeedScreen from './screens/IncidentFeedScreen';
import IncidentDetailScreen from './screens/IncidentDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import RelayConnectScreen from './screens/RelayConnectScreen';
import WalletScreen from './screens/WalletScreen';
import LoginScreen from './screens/LoginScreen';
import { ndk } from './lib/ndk';
import { navigationRef } from './lib/navigation';
import { DEFAULT_RELAYS, loadRelays } from './lib/relay/storage';
import { normalizeRelayUrl } from './lib/relay/config';
import { theme } from './lib/theme';
import { useAppTheme } from '@hooks';
import { IncidentCacheProvider, LocationProvider, IncidentSubscriptionProvider, RelayStatusProvider } from '@contexts';
import { ToastProvider, ErrorBoundary, ScreenContainer } from '@components/ui';
import IncidentNotificationBridge from '@components/notifications/IncidentNotificationBridge';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Tab Navigator - 3 main tabs: Map, Incidents, Profile
 */
function TabNavigator() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Add bottom inset to tab bar height for iPhones with home indicator
  const TAB_BAR_BASE_HEIGHT = 60;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.background,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }}
    >
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
        name="Incidents"
        component={IncidentFeedScreen}
        options={{
          tabBarLabel: "Incidents",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📋</Text>
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
  );
}

/**
 * Main Navigation with Stack (for modal screens like Relays)
 */
function MainNavigation() {
  const { isDark, colors } = useAppTheme();

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <IncidentNotificationBridge />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
          options={({ navigation }) => ({
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Wallet',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 16 }}
                hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
              </Pressable>
            ),
          })}
        />
        <Stack.Screen
          name="Relays"
          component={RelayConnectScreen}
          options={({ navigation }) => ({
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Relay Settings',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                style={{ paddingHorizontal: 16 }}
                hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 22, color: colors.text }}>✕</Text>
              </Pressable>
            ),
          })}
        />
      </Stack.Navigator>
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

function StartupScreen() {
  const { isDark, colors } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenContainer centerContent>
        <ActivityIndicator size="large" color={colors.primary} />
        <RNEText h3 style={[styles.startupTitle, { color: colors.text }]}>
          Starting Eventinel
        </RNEText>
        <RNEText style={[styles.startupSubtitle, { color: colors.textMuted }]}>
          Loading relays and cached incidents...
        </RNEText>
      </ScreenContainer>
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
    let isCancelled = false;
    let didProceed = false;
    let didStartConnect = false;

    // Guardrail: never let a stalled AsyncStorage read block the UI indefinitely.
    const RELAY_LOAD_TIMEOUT_MS = __DEV__ ? 5000 : 2500;

    type PoolRelayLike = {
      url: string;
      connect?: () => void;
    };

    const isPoolRelayLike = (relay: unknown): relay is PoolRelayLike => {
      if (!relay || typeof relay !== 'object') {
        return false;
      }
      const maybeUrl = (relay as { url?: unknown }).url;
      return typeof maybeUrl === 'string';
    };

    const getPoolRelays = (): PoolRelayLike[] => {
      // Some tests provide partial NDK mocks without a full Map-like relays object.
      const relaysMap = (ndk.pool as { relays?: { values?: () => Iterable<unknown> } } | undefined)?.relays;
      if (!relaysMap?.values) return [];
      return Array.from(relaysMap.values()).filter(isPoolRelayLike);
    };

    const getPoolRelayByUrl = (url: string): PoolRelayLike | undefined => {
      const normalized = normalizeRelayUrl(url);
      for (const relay of getPoolRelays()) {
        if (normalizeRelayUrl(relay.url) === normalized) {
          return relay;
        }
      }
      return undefined;
    };

    const addRelaysToPool = (urls: string[]) => {
      for (const url of urls) {
        const normalized = normalizeRelayUrl(url);
        if (!getPoolRelayByUrl(normalized)) {
          ndk.addExplicitRelay(normalized);
        }
      }
    };

    const connectPoolOnce = () => {
      if (didStartConnect) return;
      didStartConnect = true;
      ndk.connect().catch((err) => console.warn('⚠️ [App] Relay connection warning:', err));
    };

    const proceedWithRelays = (urls: string[], source: string) => {
      if (isCancelled) return;

      if (!didProceed) {
        didProceed = true;

        console.log(`📥 [App] Using ${urls.length} relays (${source}):`, urls);
        if (urls.length === 0) {
          console.warn('⚠️ [App] No relays available. Add relays in Profile > Relay Settings.');
        }

        addRelaysToPool(urls);
        connectPoolOnce();

        setIsReady(true);
        console.log('✅ [App] UI ready, relays connecting...');
        return;
      }

      // If we already proceeded (timeout path), merge in any saved relays when they arrive.
      const missing = urls.filter((url) => !getPoolRelayByUrl(url));
      if (missing.length > 0) {
        console.log(`➕ [App] Adding ${missing.length} relays (${source}):`, missing);
        addRelaysToPool(missing);
        for (const url of missing) {
          getPoolRelayByUrl(url)?.connect?.();
        }
      }
    };

    console.log('🚀 [App] Initializing relay connections...');

    const timeoutId = setTimeout(() => {
      console.warn(
        `⏰ [App] loadRelays() timed out after ${RELAY_LOAD_TIMEOUT_MS}ms; starting with defaults`
      );
      proceedWithRelays(DEFAULT_RELAYS, 'timeout-defaults');
    }, RELAY_LOAD_TIMEOUT_MS);

    loadRelays()
      .then((savedRelays) => {
        clearTimeout(timeoutId);
        proceedWithRelays(savedRelays, 'storage');
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('❌ [App] Failed to load relays:', error);
        proceedWithRelays(DEFAULT_RELAYS, 'storage-error-defaults');
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const content = !isReady ? (
    <StartupScreen />
  ) : !currentUser ? (
    <LoginWrapper />
  ) : (
    <LocationProvider>
      <RelayStatusProvider>
        <IncidentCacheProvider>
          <IncidentSubscriptionProvider>
            <MainNavigation />
          </IncidentSubscriptionProvider>
        </IncidentCacheProvider>
      </RelayStatusProvider>
    </LocationProvider>
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          {content}
        </ErrorBoundary>
        <ToastProvider />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  startupTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  startupSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
