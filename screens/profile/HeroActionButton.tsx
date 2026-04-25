import { Pressable, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';

import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

type HeroActionButtonProps = {
  colors: ThemeColors;
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  variant: 'primary' | 'secondary';
};

export function HeroActionButton({
  colors,
  icon,
  label,
  onPress,
  disabled,
  variant,
}: HeroActionButtonProps) {
  const isPrimary = variant === 'primary';
  const iconColor = disabled ? colors.textMuted : isPrimary ? '#FFFFFF' : colors.text;
  const labelColor = disabled ? colors.textMuted : isPrimary ? '#FFFFFF' : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.heroActionButton,
        styles.heroAction,
        isPrimary
          ? [styles.heroActionPrimary, { backgroundColor: colors.primary }]
          : [
              styles.heroActionSecondary,
              {
                backgroundColor: colors.background,
                borderColor: disabled ? colors.border : colors.primary,
              },
            ],
        pressed && !disabled && (isPrimary ? styles.heroActionPrimaryPressed : styles.heroActionSecondaryPressed),
        disabled && (isPrimary ? styles.heroActionPrimaryDisabled : styles.heroActionSecondaryDisabled),
      ]}
    >
      <View style={styles.heroActionContent}>
        <Icon name={icon} type="material" size={18} color={iconColor} />
        <Text
          style={[
            styles.heroActionLabel,
            isPrimary ? styles.heroActionPrimaryText : styles.heroActionSecondaryText,
            { color: labelColor },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
