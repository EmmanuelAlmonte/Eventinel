import 'react-native-get-random-values'; // MUST be first import!
import { useEffect, useState } from 'react';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import { AppStartupScreen } from './components/AppStartupScreen';
import { MainNavigation } from './AppNavigation';
import { useAppRelayBootstrap } from './hooks/useAppRelayBootstrap';
import { ndk } from './lib/ndk';
import { theme } from './lib/theme';
import { useAppTheme } from '@hooks';
import {
  loadSessionsFromStorage,
  migrateLegacyLogin,
  NDKSessionExpoSecureStore,
  useNDKCurrentPubkey,
  useNDKInit,
  useSessionMonitor,
} from '@nostr-dev-kit/mobile';
import { IncidentCacheProvider, LocationProvider, IncidentSubscriptionProvider, RelayStatusProvider } from '@contexts';
import { ToastProvider, ErrorBoundary } from '@components/ui';
import { ThemeProvider } from '@rneui/themed';

const AUTH_RESTORE_TIMEOUT_MS = __DEV__ ? 3500 : 2000;

function LoginWrapper() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LoginScreen />
    </>
  );
}

function useAuthRestoreGate() {
  const currentPubkey = useNDKCurrentPubkey();
  const [hasStoredSession, setHasStoredSession] = useState<boolean | null>(null);
  const [didRestoreTimeout, setDidRestoreTimeout] = useState(false);

  // Detect if this device has a persisted NDK session before deciding whether
  // we should hold startup while session restoration finishes.
  useEffect(() => {
    let isCancelled = false;

    const detectStoredSession = async () => {
      try {
        const storageAdapter = new NDKSessionExpoSecureStore();
        await migrateLegacyLogin(storageAdapter);
        const sessions = loadSessionsFromStorage(storageAdapter);
        if (!isCancelled) {
          setHasStoredSession(sessions.length > 0);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[App] Failed to inspect stored NDK sessions:', error);
        }
        if (!isCancelled) {
          setHasStoredSession(false);
        }
      }
    };

    void detectStoredSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasStoredSession !== true || currentPubkey || didRestoreTimeout) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDidRestoreTimeout(true);
      console.warn(
        `[App] Session restore timeout after ${AUTH_RESTORE_TIMEOUT_MS}ms; showing Login fallback.`
      );
    }, AUTH_RESTORE_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentPubkey, didRestoreTimeout, hasStoredSession]);

  const isAuthRestoreResolved =
    hasStoredSession === false || Boolean(currentPubkey) || didRestoreTimeout;

  return { currentPubkey, isAuthRestoreResolved };
}

function AppContent() {
  const isReady = useAppRelayBootstrap();
  const initializeNDK = useNDKInit(); // Initialize all 4 stores (NDK, sessions, profiles, mutes)
  const { currentPubkey, isAuthRestoreResolved } = useAuthRestoreGate();

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

  return !isReady || !isAuthRestoreResolved ? (
    <AppStartupScreen colors={colors} isDark={isDark} />
  ) : !currentPubkey ? (
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
