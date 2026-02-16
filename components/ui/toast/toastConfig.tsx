import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  BaseToast,
  ErrorToast,
  type ToastConfig,
  type ToastProps,
} from 'react-native-toast-message';
import { Icon } from '@rneui/themed';

import { useAppTheme } from '@hooks';

type ToastVariant = {
  borderColor: string;
  iconName: string;
  iconColor: string;
  component?: typeof BaseToast;
};

function renderToastVariant(
  props: ToastProps,
  variant: ToastVariant,
  baseStyle: object,
  text1Style: object,
  text2Style: object
) {
  const Component = variant.component ?? BaseToast;

  return (
    <Component
      {...props}
      style={[baseStyle, { borderLeftColor: variant.borderColor }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={text1Style}
      text2Style={text2Style}
      renderLeadingIcon={() => (
        <View style={styles.iconContainer}>
          <Icon name={variant.iconName} type="material" size={24} color={variant.iconColor} />
        </View>
      )}
    />
  );
}

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
    success: (props) =>
      renderToastVariant(
        props,
        { borderColor: colors.success, iconName: 'check-circle', iconColor: colors.success },
        baseStyle,
        text1Style,
        text2Style
      ),
    error: (props) =>
      renderToastVariant(
        props,
        {
          borderColor: colors.error,
          iconName: 'error',
          iconColor: colors.error,
          component: ErrorToast,
        },
        baseStyle,
        text1Style,
        text2Style
      ),
    info: (props) =>
      renderToastVariant(
        props,
        { borderColor: colors.info, iconName: 'info', iconColor: colors.info },
        baseStyle,
        text1Style,
        text2Style
      ),
    warning: (props) =>
      renderToastVariant(
        props,
        { borderColor: colors.warning, iconName: 'warning', iconColor: colors.warning },
        baseStyle,
        text1Style,
        text2Style
      ),
    network: (props) =>
      renderToastVariant(
        props,
        { borderColor: colors.primary, iconName: 'wifi', iconColor: colors.primary },
        baseStyle,
        text1Style,
        text2Style
      ),
  };
}

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
