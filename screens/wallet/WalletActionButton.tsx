import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { walletScreenStyles as styles } from './styles';

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  surface: string;
  text: string;
  textMuted: string;
};

type WalletActionVariant = 'primary' | 'secondary' | 'ghost';

type WalletActionButtonProps = {
  colors: ThemeColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: WalletActionVariant;
  iconName?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

function resolvePalette(colors: ThemeColors, variant: WalletActionVariant, disabled: boolean) {
  if (disabled) {
    return {
      backgroundColor: colors.background,
      borderColor: colors.border,
      textColor: colors.textMuted,
      iconColor: colors.textMuted,
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: colors.background,
        borderColor: colors.border,
        textColor: colors.text,
        iconColor: colors.text,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.primary,
        iconColor: colors.primary,
      };
    case 'primary':
    default:
      return {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: '#FFFFFF',
        iconColor: '#FFFFFF',
      };
  }
}

export function WalletActionButton({
  colors,
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  iconName,
  containerStyle,
}: WalletActionButtonProps) {
  const palette = resolvePalette(colors, variant, disabled);

  return (
    <Pressable
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
