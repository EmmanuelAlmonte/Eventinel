import { View } from 'react-native';
import { Avatar, Card, Icon, Text } from '@rneui/themed';

import { HeroActionButton } from './HeroActionButton';
import { profileScreenStyles as styles } from './styles';
import type { ThemeColors } from './profileSectionTypes';

type IdentityHeroCardProps = {
  colors: ThemeColors;
  displayName: string;
  avatarUrl?: string;
  nip05?: string;
  about?: string;
  onCopyPubkey: () => void;
  onShareProfile: () => void;
  canCopyPubkey: boolean;
  canShareProfile: boolean;
};

export function IdentityHeroCard({
  colors,
  displayName,
  avatarUrl,
  nip05,
  about,
  onCopyPubkey,
  onShareProfile,
  canCopyPubkey,
  canShareProfile,
}: IdentityHeroCardProps) {
  return (
    <Card containerStyle={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heroTopRow}>
        {avatarUrl ? (
          <Avatar
            size={88}
            rounded
            source={{ uri: avatarUrl }}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
          />
        ) : (
          <Avatar
            size={88}
            rounded
            title={displayName.charAt(0).toUpperCase()}
            containerStyle={[styles.avatar, { backgroundColor: colors.primary }]}
            titleStyle={styles.avatarTitle}
          />
        )}

        <View style={styles.heroIdentity}>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.primary }]}>Nostr identity</Text>

          {nip05 && (
            <View style={styles.nip05Container}>
              <Icon name="verified" type="material" size={16} color={colors.primary} />
              <Text style={[styles.nip05Text, { color: colors.primary }]}>{nip05}</Text>
            </View>
          )}
        </View>
      </View>

      {about ? (
        <Text style={[styles.about, { color: colors.textMuted }]} numberOfLines={3}>
          {about}
        </Text>
      ) : null}

      <View style={styles.heroActions}>
        <HeroActionButton
          colors={colors}
          icon="content-copy"
          label="Copy key"
          onPress={onCopyPubkey}
          disabled={!canCopyPubkey}
          variant="secondary"
        />
        <HeroActionButton
          colors={colors}
          icon="share"
          label="Share profile"
          onPress={onShareProfile}
          disabled={!canShareProfile}
          variant="primary"
        />
      </View>
    </Card>
  );
}
