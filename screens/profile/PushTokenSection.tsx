import { View } from 'react-native';
import { Text } from '@rneui/themed';

import { HeroActionButton } from './HeroActionButton';
import { ProfileRow } from './ProfileRows';
import { ProfileSection } from './ProfileSection';
import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

type PushTokenSectionProps = {
  colors: ThemeColors;
  permissionLabel: string;
  permissionColor: string;
  isRequestingPermission: boolean;
  isRegisteringPush: boolean;
  isLoadingPushToken: boolean;
  pushToken: string | null;
  onRequestPermission: () => void;
  onRegisterToken: () => void;
};

export function PushTokenSection({
  colors,
  permissionLabel,
  permissionColor,
  isRequestingPermission,
  isRegisteringPush,
  isLoadingPushToken,
  pushToken,
  onRequestPermission,
  onRegisterToken,
}: PushTokenSectionProps) {
  return (
    <ProfileSection
      colors={colors}
      title="Advanced"
      description="Technical notification details and device registration."
    >
      <ProfileRow
        colors={colors}
        icon="notifications"
        title="Push notifications"
        description="Registration and delivery status"
        rightContent={
          <View style={[styles.statusBadge, { borderColor: permissionColor }]}>
            <View style={[styles.statusDot, { backgroundColor: permissionColor }]} />
            <Text style={[styles.statusText, { color: permissionColor }]}>{permissionLabel}</Text>
          </View>
        }
      />

      <View style={[styles.advancedBody, { borderTopColor: colors.border }]}>
        <View style={styles.advancedActions}>
          <HeroActionButton
            colors={colors}
            icon="notifications-active"
            label="Request permission"
            onPress={onRequestPermission}
            disabled={isRequestingPermission || isRegisteringPush}
            variant="secondary"
          />
          <HeroActionButton
            colors={colors}
            icon="cloud-upload"
            label="Register token"
            onPress={onRegisterToken}
            disabled={isRegisteringPush || isRequestingPermission}
            variant="primary"
          />
        </View>

        {isLoadingPushToken ? (
          <Text style={[styles.advancedHint, { color: colors.textMuted }]}>Loading push token...</Text>
        ) : pushToken ? (
          <>
            <Text style={[styles.advancedToken, { color: colors.text, backgroundColor: colors.background }]} selectable>
              {pushToken}
            </Text>
            <Text style={[styles.advancedHint, { color: colors.textMuted }]}>Tap and hold to copy</Text>
          </>
        ) : (
          <Text style={[styles.advancedEmpty, { color: colors.textMuted }]}>
            No push token yet. Open the app on a physical device and allow notifications.
          </Text>
        )}
      </View>
    </ProfileSection>
  );
}
