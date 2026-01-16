/**
 * ScreenContainer
 *
 * Base container for all app screens with proper safe area handling,
 * theme-aware background, and optional scroll behavior.
 */

import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Use ScrollView instead of View (default: false) */
  scroll?: boolean;
  /** Enable pull-to-refresh (only works with scroll=true) */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Additional container style */
  style?: ViewStyle;
  /** Apply safe area padding (default: true) */
  safeArea?: boolean;
  /** Override background color (uses theme background by default) */
  backgroundColor?: string;
  /** Horizontal padding (default: 16) */
  paddingHorizontal?: number;
  /** Center content vertically */
  centerContent?: boolean;
}

export function ScreenContainer({
  children,
  scroll = false,
  refreshing,
  onRefresh,
  style,
  safeArea = true,
  backgroundColor,
  paddingHorizontal = 16,
  centerContent = false,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  // Use provided backgroundColor or theme background
  const bgColor = backgroundColor ?? colors.background;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: bgColor,
    paddingTop: safeArea ? insets.top : 0,
    paddingBottom: safeArea ? insets.bottom : 0,
    paddingHorizontal,
    ...(centerContent && { justifyContent: 'center', alignItems: 'center' }),
    ...style,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: bgColor }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: safeArea ? insets.top + 16 : 16,
            paddingBottom: safeArea ? insets.bottom + 16 : 16,
            paddingHorizontal,
          },
          centerContent && styles.centerContent,
          style,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
              colors={[colors.textMuted]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
