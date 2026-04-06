import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@rneui/themed';

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
  subtitle?: string;
  disabled?: boolean;
};

type ThemeColors = {
  background: string;
  border: string;
  primary: string;
  text: string;
  textMuted: string;
};

type SegmentedControlProps<T extends string> = {
  colors: ThemeColors;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
  gap?: number;
};

const HORIZONTAL_PADDING = 4;

export function SegmentedControl<T extends string>({
  colors,
  options,
  value,
  onChange,
  style,
  height = 76,
  gap = 2,
}: SegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.key === value)),
    [options, value]
  );

  const segmentWidth =
    containerWidth > 0
      ? (containerWidth - HORIZONTAL_PADDING * 2 - gap * (options.length - 1)) / options.length
      : 0;

  useEffect(() => {
    if (!segmentWidth) return;

    Animated.timing(translateX, {
      toValue: activeIndex * (segmentWidth + gap),
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, gap, segmentWidth, translateX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.outer, style]}>
      <View
        onLayout={handleLayout}
        style={[
          styles.container,
          {
            height,
            gap,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePill,
              {
                width: segmentWidth,
                borderColor: `${colors.primary}66`,
                transform: [{ translateX }],
              },
            ]}
          >
            <LinearGradient
              colors={['#8B5CF6', colors.primary, '#5B21B6']}
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 0.9 }}
              style={styles.activeGradient}
            />
            <View style={styles.activeGlow} />
          </Animated.View>
        ) : null}

        {options.map((option) => {
          const isActive = option.key === value;
          const isDisabled = Boolean(option.disabled);

          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => {
                if (!isDisabled) onChange(option.key);
              }}
              style={({ pressed }) => [
                styles.segment,
                pressed && !isDisabled && styles.segmentPressed,
                isDisabled && styles.segmentDisabled,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: isActive ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                {option.label}
              </Text>

              {option.subtitle ? (
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={1}
                  style={[
                    styles.subtitle,
                    {
                      color: isActive
                        ? 'rgba(255,255,255,0.80)'
                        : `${colors.textMuted}CC`,
                    },
                  ]}
                >
                  {option.subtitle}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
  },
  container: {
    position: 'relative',
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: HORIZONTAL_PADDING,
  },
  activePill: {
    position: 'absolute',
    top: HORIZONTAL_PADDING,
    bottom: HORIZONTAL_PADDING,
    left: HORIZONTAL_PADDING,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    overflow: 'hidden',
  },
  activeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 2,
  },
  segmentPressed: {
    opacity: 0.94,
  },
  segmentDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
});
