import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@hooks';
import type { ReportIncidentType, ReportSourceTab, RootStackParamList } from '@lib/navigation';

type ReportIncidentSubmittedScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ReportIncidentSubmitted'
>;

const TYPE_LABELS: Record<ReportIncidentType, string> = {
  violent_crime: 'Crime',
  fire: 'Fire',
  traffic: 'Traffic',
  medical: 'Medical',
  suspicious: 'Suspicious',
  other: 'Other',
};

function buildReturnLabel(sourceTab?: ReportSourceTab) {
  if (sourceTab === 'Incidents') {
    return 'Back to incidents';
  }

  if (sourceTab === 'Map') {
    return 'Back to map';
  }

  return 'Back to app';
}

export default function ReportIncidentSubmittedScreen({
  navigation,
  route,
}: ReportIncidentSubmittedScreenProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { incidentType, locationLabel, relayCount, sourceTab, stillActive } = route.params;
  const relaySummary =
    relayCount === 1
      ? 'Sent using 1 currently connected relay.'
      : `Sent using ${relayCount} currently connected relays.`;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="check-bold" size={26} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Report sent</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {relaySummary} The report flow is complete and the draft has been cleared.
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[incidentType]}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: stillActive ? colors.success : colors.background,
                borderColor: stillActive ? colors.success : colors.border,
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: stillActive ? '#FFFFFF' : colors.text }]}>
              {stillActive ? 'Still active' : 'No longer active'}
            </Text>
          </View>
        </View>

        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Reported location</Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>{locationLabel}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buildReturnLabel(sourceTab)}
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{buildReturnLabel(sourceTab)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
