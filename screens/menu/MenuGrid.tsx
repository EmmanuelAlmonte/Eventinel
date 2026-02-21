import React from 'react';
import { View } from 'react-native';
import { Card, Icon, Text } from '@rneui/themed';

import { menuItems } from './menuItems';
import { menuScreenStyles as styles } from './styles';

type MenuGridProps = {
  colors: {
    surface: string;
    border: string;
    text: string;
    textMuted: string;
  };
  onNavigate: (screen: string) => void;
};

export function MenuGrid({ colors, onNavigate }: MenuGridProps) {
  return (
    <View style={styles.grid}>
      {menuItems.map((item) => (
        <Card
          key={item.screen}
          containerStyle={[
            styles.menuCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: item.color,
              borderLeftWidth: 4,
            },
          ]}
          wrapperStyle={styles.menuCardWrapper}
        >
          <View style={styles.menuCardInner}>
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
              <Icon name={item.icon} type={item.iconType} size={28} color={item.color} />
            </View>
            <View style={styles.menuCardContent}>
              <Text style={[styles.menuCardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuCardDescription, { color: colors.textMuted }]}>
                {item.description}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              type="material"
              size={24}
              color={colors.textMuted}
              onPress={() => onNavigate(item.screen)}
              containerStyle={styles.chevronContainer}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}
