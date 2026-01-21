/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Prevents the entire app from crashing due to render errors.
 *
 * ## Usage
 * ```tsx
 * import { ErrorBoundary, ScreenErrorFallback } from '@components/ui';
 *
 * // Wrap individual screens
 * <ErrorBoundary fallback={<ScreenErrorFallback />}>
 *   <MyScreen />
 * </ErrorBoundary>
 *
 * // Or wrap the entire app
 * <ErrorBoundary onError={(error) => logToService(error)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * ## With Custom Fallback
 * ```tsx
 * <ErrorBoundary
 *   fallback={
 *     <View>
 *       <Text>Custom error message</Text>
 *     </View>
 *   }
 * >
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Icon, Button } from '@rneui/themed';
import { PRIMARY, SEMANTIC, NEUTRAL } from '@lib/brand/colors';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to show when error occurs */
  fallback?: ReactNode;
  /** Callback when error is caught (for logging/analytics) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to show error details (dev mode) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// ErrorBoundary Class Component
// ============================================================================

/**
 * Error Boundary - catches render errors and displays fallback UI.
 *
 * Note: Error boundaries only catch errors in:
 * - Render methods
 * - Lifecycle methods
 * - Constructors of child components
 *
 * They do NOT catch errors in:
 * - Event handlers (use try/catch)
 * - Async code (use try/catch)
 * - Server-side rendering
 * - Errors in the boundary itself
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to show fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Store error info for display
    this.setState({ errorInfo });

    // Call optional error callback (for logging services)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = __DEV__ } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Default Fallback UI
// ============================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  showDetails: boolean;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onRetry,
  showDetails,
}: DefaultErrorFallbackProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Icon
            name="error-outline"
            type="material"
            size={64}
            color={SEMANTIC.error}
          />
        </View>

        {/* Error Message */}
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          We're sorry, but something unexpected happened.{'\n'}
          Please try again.
        </Text>

        {/* Retry Button */}
        <Button
          title="Try Again"
          onPress={onRetry}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.button}
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

        {/* Error Details (Dev Mode) */}
        {showDetails && error && (
          <View style={styles.detailsContainer}>
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={styles.detailsHeader}
            >
              <Text style={styles.detailsTitle}>Error Details</Text>
              <Icon
                name={expanded ? 'expand-less' : 'expand-more'}
                type="material"
                size={20}
                color={NEUTRAL.gray400}
              />
            </Pressable>

            {expanded && (
              <ScrollView style={styles.detailsScroll}>
                <Text style={styles.errorName}>{error.name}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
                {errorInfo && (
                  <Text style={styles.stackTrace}>
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

// ============================================================================
// Pre-built Fallback Components
// ============================================================================

/**
 * Screen-level error fallback with full-screen styling.
 * Use this when wrapping entire screens.
 */
export function ScreenErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.screenFallback}>
      <Icon
        name="cloud-off"
        type="material"
        size={80}
        color={NEUTRAL.gray400}
      />
      <Text style={styles.screenTitle}>Unable to load screen</Text>
      <Text style={styles.screenMessage}>
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

/**
 * Card-level error fallback for smaller components.
 * Use this when wrapping individual cards or widgets.
 */
export function CardErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.cardFallback}>
      <Icon
        name="warning"
        type="material"
        size={32}
        color={SEMANTIC.warning}
      />
      <Text style={styles.cardMessage}>Failed to load</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.cardRetry}>
          <Text style={styles.cardRetryText}>Tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Inline error fallback for minimal disruption.
 * Use this for non-critical components.
 */
export function InlineErrorFallback() {
  return (
    <View style={styles.inlineFallback}>
      <Icon name="error" type="material" size={16} color={SEMANTIC.error} />
      <Text style={styles.inlineMessage}>Error loading content</Text>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Default Fallback
  container: {
    flex: 1,
    backgroundColor: NEUTRAL.gray900,
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
    color: NEUTRAL.gray100,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: NEUTRAL.gray400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  button: {
    backgroundColor: PRIMARY.main,
    borderRadius: 8,
    paddingVertical: 14,
  },

  // Error Details
  detailsContainer: {
    width: '100%',
    backgroundColor: NEUTRAL.gray800,
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: NEUTRAL.gray700,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NEUTRAL.gray400,
  },
  detailsScroll: {
    maxHeight: 200,
    padding: 12,
  },
  errorName: {
    fontSize: 14,
    fontWeight: '700',
    color: SEMANTIC.error,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: NEUTRAL.gray300,
    marginBottom: 12,
  },
  stackTrace: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: NEUTRAL.gray500,
    lineHeight: 16,
  },

  // Screen Fallback
  screenFallback: {
    flex: 1,
    backgroundColor: NEUTRAL.gray900,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: NEUTRAL.gray100,
    marginTop: 24,
    marginBottom: 8,
  },
  screenMessage: {
    fontSize: 15,
    color: NEUTRAL.gray400,
    textAlign: 'center',
    marginBottom: 24,
  },
  screenButtonContainer: {
    minWidth: 120,
  },

  // Card Fallback
  cardFallback: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${SEMANTIC.warning}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${SEMANTIC.warning}30`,
  },
  cardMessage: {
    fontSize: 14,
    color: NEUTRAL.gray400,
    marginTop: 8,
  },
  cardRetry: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cardRetryText: {
    fontSize: 13,
    color: PRIMARY.main,
    fontWeight: '500',
  },

  // Inline Fallback
  inlineFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  inlineMessage: {
    fontSize: 13,
    color: SEMANTIC.error,
  },
});

export default ErrorBoundary;
