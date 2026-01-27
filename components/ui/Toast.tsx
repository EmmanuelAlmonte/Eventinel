/**
 * Toast Component
 *
 * Theme-aware toast notification system for Eventinel.
 * Wraps react-native-toast-message with custom styling and helper functions.
 *
 * ## Setup (Required in App.tsx)
 * ```tsx
 * import { ToastProvider } from '@components/ui';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *       <ToastProvider />  // Must be LAST child
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * ## Usage in Screens
 * ```tsx
 * import { showToast } from '@components/ui';
 *
 * // Success toast
 * showToast.success('Note published!');
 *
 * // Error toast
 * showToast.error('Failed to connect');
 *
 * // Info toast
 * showToast.info('Connecting to relay...');
 *
 * // Custom toast
 * showToast.show({
 *   type: 'success',
 *   text1: 'Title',
 *   text2: 'Description',
 *   visibilityTime: 4000,
 * });
 * ```
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import ToastLib, { BaseToast, ErrorToast, ToastConfig, ToastShowParams } from 'react-native-toast-message';
import { Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@hooks';
import { PRIMARY, SEMANTIC } from '@lib/brand/colors';

// ============================================================================
// Toast Configuration (Theme-aware)
// ============================================================================

/**
 * Custom toast configuration with Eventinel theming.
 * Uses dark theme colors by default.
 */
export function useToastConfig(): ToastConfig {
  const { colors, isDark } = useAppTheme();

  const baseStyle = {
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: isDark ? '#27272A' : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 60,
    paddingVertical: 12,
  };

  const text1Style = {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  };

  const text2Style = {
    fontSize: 13,
    color: colors.textMuted,
  };

  return {
    success: (props) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: colors.success }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={text1Style}
        text2Style={text2Style}
        renderLeadingIcon={() => (
          <View style={styles.iconContainer}>
            <Icon name="check-circle" type="material" size={24} color={colors.success} />
          </View>
        )}
      />
    ),

    error: (props) => (
      <ErrorToast
        {...props}
        style={[baseStyle, { borderLeftColor: colors.error }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={text1Style}
        text2Style={text2Style}
        renderLeadingIcon={() => (
          <View style={styles.iconContainer}>
            <Icon name="error" type="material" size={24} color={colors.error} />
          </View>
        )}
      />
    ),

    info: (props) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: colors.info }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={text1Style}
        text2Style={text2Style}
        renderLeadingIcon={() => (
          <View style={styles.iconContainer}>
            <Icon name="info" type="material" size={24} color={colors.info} />
          </View>
        )}
      />
    ),

    warning: (props) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: colors.warning }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={text1Style}
        text2Style={text2Style}
        renderLeadingIcon={() => (
          <View style={styles.iconContainer}>
            <Icon name="warning" type="material" size={24} color={colors.warning} />
          </View>
        )}
      />
    ),

    // Custom type for network/relay status
    network: (props) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: PRIMARY.main }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={text1Style}
        text2Style={text2Style}
        renderLeadingIcon={() => (
          <View style={styles.iconContainer}>
            <Icon name="wifi" type="material" size={24} color={PRIMARY.main} />
          </View>
        )}
      />
    ),
  };
}

// ============================================================================
// Toast Provider Component
// ============================================================================

/**
 * Toast Provider - renders the toast container.
 * Must be placed at the ROOT of your app, AFTER ThemeProvider.
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <NavigationContainer>
 *     <AppContent />
 *   </NavigationContainer>
 *   <ToastProvider />
 * </ThemeProvider>
 * ```
 */
export function ToastProvider() {
  const config = useToastConfig();
  const insets = useSafeAreaInsets();

  // Add safe area inset to ensure toast appears below notch/Dynamic Island
  const topOffset = insets.top + 16;

  return (
    <ToastLib
      config={config}
      position="top"
      topOffset={topOffset}
      visibilityTime={3000}
    />
  );
}

// ============================================================================
// Toast Helper Functions
// ============================================================================

/**
 * Show a toast notification.
 *
 * @example
 * ```tsx
 * // Quick success
 * showToast.success('Saved!');
 *
 * // Error with description
 * showToast.error('Failed to save', 'Check your connection');
 *
 * // Full control
 * showToast.show({
 *   type: 'info',
 *   text1: 'Syncing...',
 *   text2: 'This may take a moment',
 *   visibilityTime: 5000,
 * });
 * ```
 */
export const showToast = {
  /**
   * Show a success toast
   */
  success: (title: string, message?: string) => {
    ToastLib.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  },

  /**
   * Show an error toast
   */
  error: (title: string, message?: string) => {
    ToastLib.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: 4000, // Errors stay longer
    });
  },

  /**
   * Show an info toast
   */
  info: (title: string, message?: string) => {
    ToastLib.show({
      type: 'info',
      text1: title,
      text2: message,
    });
  },

  /**
   * Show a warning toast
   */
  warning: (title: string, message?: string) => {
    ToastLib.show({
      type: 'warning',
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  },

  /**
   * Show a network/relay status toast
   */
  network: (title: string, message?: string) => {
    ToastLib.show({
      type: 'network',
      text1: title,
      text2: message,
    });
  },

  /**
   * Show a custom toast with full options
   */
  show: (params: ToastShowParams) => {
    ToastLib.show(params);
  },

  /**
   * Hide the current toast
   */
  hide: () => {
    ToastLib.hide();
  },
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
  },
});

// Default export for the provider
export default ToastProvider;
