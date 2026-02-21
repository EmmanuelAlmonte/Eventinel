import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Icon, Button } from '@rneui/themed';

import { useAppTheme } from '@hooks';

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  showDetails: boolean;
}

export function DefaultErrorFallback({
  error,
  errorInfo,
  onRetry,
  showDetails,
}: DefaultErrorFallbackProps) {
  const [expanded, setExpanded] = React.useState(false);
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="error-outline" type="material" size={64} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: colors.textMuted }]}>
          We're sorry, but something unexpected happened.{'\n'}
          Please try again.
        </Text>

        <Button
          title="Try Again"
          onPress={onRetry}
          containerStyle={styles.buttonContainer}
          buttonStyle={[styles.button, { backgroundColor: colors.primary }]}
          icon={
            <Icon
              name="refresh"
              type="material"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          }
        />

        {showDetails && error && (
          <View style={[styles.detailsContainer, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              style={[styles.detailsHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.detailsTitle, { color: colors.textMuted }]}>Error Details</Text>
              <Icon
                name={expanded ? 'expand-less' : 'expand-more'}
                type="material"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>

            {expanded && (
              <ScrollView style={styles.detailsScroll}>
                <Text style={[styles.errorName, { color: colors.error }]}>{error.name}</Text>
                <Text style={[styles.errorMessage, { color: colors.textMuted }]}>{error.message}</Text>
                {errorInfo && (
                  <Text style={[styles.stackTrace, { color: colors.textMuted }]}>
                    {errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function ScreenErrorFallback({ onRetry }: { onRetry?: () => void }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.screenFallback, { backgroundColor: colors.background }]}>
      <Icon name="cloud-off" type="material" size={80} color={colors.textMuted} />
      <Text style={[styles.screenTitle, { color: colors.text }]}>Unable to load screen</Text>
      <Text style={[styles.screenMessage, { color: colors.textMuted }]}>
        Something went wrong while loading this screen.
      </Text>
      {onRetry && (
        <Button
          title="Retry"
          onPress={onRetry}
          type="outline"
          containerStyle={styles.screenButtonContainer}
        />
      )}
    </View>
  );
}

export function CardErrorFallback({ onRetry }: { onRetry?: () => void }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.cardFallback,
        {
          backgroundColor: `${colors.warning}10`,
          borderColor: `${colors.warning}30`,
        },
      ]}
    >
      <Icon name="warning" type="material" size={32} color={colors.warning} />
      <Text style={[styles.cardMessage, { color: colors.textMuted }]}>Failed to load</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.cardRetry}>
          <Text style={[styles.cardRetryText, { color: colors.primary }]}>Tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export function InlineErrorFallback() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.inlineFallback}>
      <Icon name="error" type="material" size={16} color={colors.error} />
      <Text style={[styles.inlineMessage, { color: colors.error }]}>Error loading content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
  },
  detailsContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsScroll: {
    maxHeight: 200,
    padding: 12,
  },
  errorName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    marginBottom: 12,
  },
  stackTrace: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  screenFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  screenMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  screenButtonContainer: {
    minWidth: 120,
  },
  cardFallback: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  cardMessage: {
    fontSize: 14,
    marginTop: 8,
  },
  cardRetry: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cardRetryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlineFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  inlineMessage: {
    fontSize: 13,
  },
});
