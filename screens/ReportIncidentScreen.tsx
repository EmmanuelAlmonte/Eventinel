import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Input, Text } from '@rneui/themed';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';
import { useSharedLocation } from '@contexts';
import type { RootStackParamList } from '@lib/navigation';

type ReportIncidentScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportIncident'>;

function formatLocationLabel(location?: { latitude: number; longitude: number } | null) {
  if (!location) {
    return 'Current device location will be used if available.';
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export default function ReportIncidentScreen({ route }: ReportIncidentScreenProps) {
  const { colors } = useAppTheme();
  const { location: sharedLocation } = useSharedLocation();
  const [description, setDescription] = useState('');
  const [locationNote, setLocationNote] = useState('');

  const effectiveLocation = useMemo(() => {
    if (route.params?.location) {
      return route.params.location;
    }

    if (!sharedLocation) {
      return null;
    }

    return {
      longitude: sharedLocation[0],
      latitude: sharedLocation[1],
    };
  }, [route.params?.location, sharedLocation]);

  const sourceCopy =
    route.params?.sourceTab === 'Map'
      ? 'Starting from the map so nearby context can be carried into the report.'
      : route.params?.sourceTab === 'Incidents'
        ? 'Starting from incidents so your current nearby context can carry forward.'
        : 'Start with the basics and refine the report in the next step.';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer scroll>
        <View style={styles.header}>
          <Text h2 style={[styles.title, { color: colors.text }]}>
            Report incident
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Capture what happened, confirm the location, and prepare the report for review.
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          </View>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{sourceCopy}</Text>
          <View style={[styles.locationSurface, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Report location</Text>
            <Text style={[styles.locationValue, { color: colors.text }]}>
              {formatLocationLabel(effectiveLocation)}
            </Text>
          </View>
          <Input
            placeholder="Optional landmark or location note"
            value={locationNote}
            onChangeText={setLocationNote}
            autoCapitalize="sentences"
            autoCorrect
            containerStyle={styles.inputContainer}
            inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
            inputStyle={[styles.inputText, { color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident details</Text>
          </View>
          <Input
            placeholder="Describe what happened"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            containerStyle={styles.inputContainer}
            inputContainerStyle={[
              styles.input,
              styles.multilineInput,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
            inputStyle={[styles.inputText, styles.multilineInputText, { color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="paperclip" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Media and context</Text>
          </View>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Add photos, links, or nearby context in a follow-up pass. This first version keeps the entry flow focused.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue report flow"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary },
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>

        <Text style={[styles.footerHint, { color: colors.textMuted }]}>
          Review and submission will be layered onto this report flow next.
        </Text>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  locationSurface: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 132,
    paddingTop: 12,
  },
  multilineInputText: {
    minHeight: 108,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 24,
  },
});
