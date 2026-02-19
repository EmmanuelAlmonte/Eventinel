import 'react-native-get-random-values'; // MUST be first import!
import { useEffect } from 'react';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import { AppStartupScreen } from './components/AppStartupScreen';
import { MainNavigation } from './AppNavigation';
import { useAppRelayBootstrap } from './hooks/useAppRelayBootstrap';
import { ndk } from './lib/ndk';
import { theme } from './lib/theme';
import { useAppTheme } from '@hooks';
import { useNDKInit, useSessionMonitor, useNDKCurrentUser } from '@nostr-dev-kit/mobile';
import { IncidentCacheProvider, LocationProvider, IncidentSubscriptionProvider, RelayStatusProvider } from '@contexts';
import { ToastProvider, ErrorBoundary } from '@components/ui';
import { ThemeProvider } from '@rneui/themed';

function LoginWrapper() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LoginScreen />
    </>
  );
}

function AppContent() {
  const isReady = useAppRelayBootstrap();
  const initializeNDK = useNDKInit(); // Initialize all 4 stores (NDK, sessions, profiles, mutes)
  const currentUser = useNDKCurrentUser();

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

  const { isDark, colors } = useAppTheme();

  return !isReady ? (
    <AppStartupScreen colors={colors} isDark={isDark} />
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
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <ToastProvider />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
