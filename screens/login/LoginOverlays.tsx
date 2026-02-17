import { View } from 'react-native';
import { Button, Icon, Overlay, Text } from '@rneui/themed';

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

type LoginLoadingOverlayProps = {
  colors: ThemeColors;
  isVisible: boolean;
};

export function LoginLoadingOverlay({ colors, isVisible }: LoginLoadingOverlayProps) {
  return (
    <Overlay
      isVisible={isVisible}
      overlayStyle={[styles.loadingOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.loadingContent}>
        <Icon name="sync" type="material" size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Connecting...</Text>
      </View>
    </Overlay>
  );
}

type GeneratedKeyOverlayProps = {
  colors: ThemeColors;
  generatedKey: string | null;
  generatedPubkey: string | null;
  isLoading: boolean;
  onUseKey: () => void;
  onDismiss: () => void;
};

export function GeneratedKeyOverlay({
  colors,
  generatedKey,
  generatedPubkey,
  isLoading,
  onUseKey,
  onDismiss,
}: GeneratedKeyOverlayProps) {
  return (
    <Overlay
      isVisible={Boolean(generatedKey)}
      overlayStyle={[styles.keyOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onBackdropPress={onDismiss}
    >
      <View style={styles.keyContent}>
        <View style={styles.cardHeader}>
          <Icon name="key" type="material" size={22} color={colors.warning} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>New Test Key</Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Save this private key. Anyone with it can control the account.
        </Text>
        {generatedKey ? (
          <Text selectable style={[styles.generatedKeyText, { color: colors.text, borderColor: colors.border }]}>
            {generatedKey}
          </Text>
        ) : null}
        {generatedPubkey ? (
          <Text style={[styles.generatedPubkeyText, { color: colors.textMuted }]}>Public key: {generatedPubkey}</Text>
        ) : null}
        <Button
          title="Use this key to login"
          onPress={onUseKey}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          icon={<Icon name="login" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
        />
        <Button
          title="Close"
          type="clear"
          onPress={onDismiss}
          disabled={isLoading}
          titleStyle={{ color: colors.textMuted }}
        />
      </View>
    </Overlay>
  );
}

type NostrConnectOverlayProps = {
  colors: ThemeColors;
  uri: string | null;
  isLoading: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onComplete: () => void;
  onDismiss: () => void;
};

export function NostrConnectOverlay({
  colors,
  uri,
  isLoading,
  onCopy,
  onOpen,
  onComplete,
  onDismiss,
}: NostrConnectOverlayProps) {
  return (
    <Overlay
      isVisible={Boolean(uri)}
      overlayStyle={[styles.keyOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onBackdropPress={onDismiss}
    >
      <View style={styles.keyContent}>
        <View style={styles.cardHeader}>
          <Icon name="link" type="material" size={22} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Nostr Connect</Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Open this URI in your signer app to authorize Eventinel.
        </Text>
        {uri ? (
          <Text selectable style={[styles.generatedKeyText, { color: colors.text, borderColor: colors.border }]}>
            {uri}
          </Text>
        ) : null}
        <Button
          title="Copy URI"
          onPress={onCopy}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          type="outline"
          buttonStyle={{ borderColor: colors.primary }}
          titleStyle={{ color: colors.primary }}
        />
        <Button
          title="Open Signer"
          onPress={onOpen}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          icon={<Icon name="open-in-new" type="material" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
        />
        <Button
          title="I Approved in Signer"
          onPress={onComplete}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Cancel"
          type="clear"
          onPress={onDismiss}
          disabled={isLoading}
          titleStyle={{ color: colors.textMuted }}
        />
      </View>
    </Overlay>
  );
}
