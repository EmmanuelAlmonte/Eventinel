/**
 * MenuScreen
 *
 * Main dashboard with quick compose and primary navigation cards.
 */

import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';

import { MenuGrid } from './menu/MenuGrid';
import { QuickComposeCard } from './menu/QuickComposeCard';
import { menuScreenStyles as styles } from './menu/styles';
import { useQuickCompose } from './menu/useQuickCompose';

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const {
    noteContent,
    setNoteContent,
    sendStatus,
    isError,
    statusColor,
    handleSendNote,
  } = useQuickCompose(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll>
        <View style={styles.header}>
          <Text h1 style={[styles.title, { color: colors.text }]}>Eventinel</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Nostr-native public safety monitoring
          </Text>
        </View>

        <QuickComposeCard
          colors={colors}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          onPublish={handleSendNote}
          sendStatus={sendStatus}
          isError={isError}
          statusColor={statusColor}
        />

        <MenuGrid
          colors={colors}
          onNavigate={(screen) => navigation.navigate(screen)}
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Tap any card to get started
          </Text>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
