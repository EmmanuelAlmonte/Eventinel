import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { loginScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  primaryDark: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
};

type LoginActionVariant = 'primary' | 'secondary' | 'neutral' | 'warning' | 'ghost';

type LoginActionButtonProps = {
  colors: ThemeColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: LoginActionVariant;
  iconName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

function resolveButtonColors(colors: ThemeColors, variant: LoginActionVariant, disabled: boolean) {
  if (disabled) {
    return {
      backgroundColor: colors.background,
      borderColor: colors.border,
      textColor: colors.textMuted,
      iconColor: colors.textMuted,
    };
  }

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: '#FFFFFF',
        iconColor: '#FFFFFF',
      };
    case 'neutral':
      return {
        backgroundColor: colors.primaryDark,
        borderColor: colors.primaryDark,
        textColor: '#FFFFFF',
        iconColor: '#FFFFFF',
      };
    case 'warning':
      return {
        backgroundColor: `${colors.warning}12`,
        borderColor: `${colors.warning}75`,
        textColor: colors.warning,
        iconColor: colors.warning,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.textMuted,
        iconColor: colors.textMuted,
      };
    case 'secondary':
    default:
      return {
        backgroundColor: colors.background,
        borderColor: colors.border,
        textColor: colors.text,
        iconColor: colors.text,
      };
  }
}

export function LoginActionButton({
  colors,
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  iconName,
  containerStyle,
  testID,
}: LoginActionButtonProps) {
  const palette = resolveButtonColors(colors, variant, disabled);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonContainer,
        containerStyle,
        styles.actionButton,
        variant === 'ghost' ? styles.actionButtonGhost : styles.actionButtonSolid,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        pressed && !disabled && styles.actionButtonPressed,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <View style={styles.actionButtonContent}>
        {iconName ? <Icon name={iconName} type="material" size={18} color={palette.iconColor} /> : null}
        <Text
          style={[
            styles.actionButtonText,
            variant === 'ghost' ? styles.actionButtonTextGhost : styles.actionButtonTextSolid,
            { color: palette.textColor },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
