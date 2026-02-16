import { Platform, Switch, View } from 'react-native';
import { Button, Card, Icon, Input, Overlay, Text } from '@rneui/themed';
import type { SignerAppInfo } from 'expo-nip55';

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

export function LoginHeader({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <Text h1 style={[styles.title, { color: colors.text }]}>Welcome to Eventinel</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to continue</Text>
    </View>
  );
}

export function LoginLoadingOverlay({ colors, isVisible }: { colors: ThemeColors; isVisible: boolean }) {
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

type Nip55CardProps = {
  colors: ThemeColors;
  apps: SignerAppInfo[];
  isLoading: boolean;
  onLogin: (app: SignerAppInfo) => void;
};

export function Nip55Card({ colors, apps, isLoading, onLogin }: Nip55CardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="security" type="material" size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Device Signer</Text>
        <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      </View>
      <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
        Sign in with an installed signer app. Your keys never leave the device.
      </Text>

      {apps.map((app) => (
        <Button
          key={app.packageName}
          title={`Login with ${app.name || app.packageName}`}
          onPress={() => onLogin(app)}
          disabled={isLoading}
          containerStyle={styles.buttonContainer}
          icon={<Icon name="key" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
        />
      ))}
    </Card>
  );
}

type RemoteSignerCardProps = {
  colors: ThemeColors;
  isIOS: boolean;
  input: string;
  setInput: (value: string) => void;
  forceLegacyNip04: boolean;
  setForceLegacyNip04: (value: boolean) => void;
  isLoading: boolean;
  onConnect: () => void;
};

export function RemoteSignerCard({
  colors,
  isIOS,
  input,
  setInput,
  forceLegacyNip04,
  setForceLegacyNip04,
  isLoading,
  onConnect,
}: RemoteSignerCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="cloud" type="material" size={24} color={isIOS ? colors.primary : colors.textMuted} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Remote Signer (NIP-46)</Text>
        {isIOS && (
          <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
        Connect via bunker:// or NIP-05 (name@domain) for secure remote signing.
      </Text>

      <Input
        placeholder="bunker://pubkey?relay=wss://... or name@domain"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={isLoading}
        leftIcon={<Icon name="link" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>
          Legacy NIP-04 (if bunker doesn't support NIP-44)
        </Text>
        <Switch
          value={forceLegacyNip04}
          onValueChange={setForceLegacyNip04}
          disabled={isLoading}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={forceLegacyNip04 ? colors.primary : colors.textMuted}
        />
      </View>

      <Button
        title="Connect to Remote Signer"
        onPress={onConnect}
        disabled={isLoading}
        containerStyle={styles.buttonContainer}
        buttonStyle={isIOS ? undefined : { backgroundColor: colors.primaryDark }}
        icon={<Icon name="login" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
      />
    </Card>
  );
}

type NostrConnectCardProps = {
  colors: ThemeColors;
  relay: string;
  setRelay: (value: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
};

export function NostrConnectCard({
  colors,
  relay,
  setRelay,
  isLoading,
  onGenerate,
}: NostrConnectCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="link" type="material" size={24} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Nostr Connect (NIP-46)</Text>
      </View>
      <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
        Generate a nostrconnect:// URI and open it in a signer app.
      </Text>

      <Input
        placeholder="wss://relay.example.com"
        value={relay}
        onChangeText={setRelay}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={isLoading}
        leftIcon={<Icon name="dns" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <Button
        title="Generate Nostr Connect"
        onPress={onGenerate}
        disabled={isLoading}
        containerStyle={styles.buttonContainer}
        icon={<Icon name="qr-code" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
      />
    </Card>
  );
}

type ManualLoginCardProps = {
  colors: ThemeColors;
  manualKey: string;
  setManualKey: (value: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onLogin: () => void;
};

export function ManualLoginCard({
  colors,
  manualKey,
  setManualKey,
  isLoading,
  onGenerate,
  onLogin,
}: ManualLoginCardProps) {
  return (
    <Card containerStyle={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Icon name="vpn-key" type="material" size={24} color={colors.warning} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Manual Login</Text>
        <View style={[styles.testOnlyBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.testOnlyText}>Testing Only</Text>
        </View>
      </View>
      <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
        Enter your private key directly. Use test keys only!
      </Text>

      <Input
        placeholder="nsec1... or hex private key"
        value={manualKey}
        onChangeText={setManualKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        disabled={isLoading}
        leftIcon={<Icon name="lock" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <Button
        title="Create New Test Key"
        onPress={onGenerate}
        disabled={isLoading}
        containerStyle={styles.buttonContainer}
        type="outline"
        buttonStyle={{ borderColor: colors.warning }}
        titleStyle={{ color: colors.warning }}
        icon={<Icon name="add-circle-outline" type="material" size={20} color={colors.warning} style={{ marginRight: 8 }} />}
      />

      <Button
        title="Login with Private Key"
        onPress={onLogin}
        disabled={isLoading}
        containerStyle={styles.buttonContainer}
        buttonStyle={{ backgroundColor: '#52525B' }}
        icon={<Icon name="key" type="material" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
      />
    </Card>
  );
}

export function SecurityNoticeCard({
  colors,
  isAndroid,
}: {
  colors: ThemeColors;
  isAndroid: boolean;
}) {
  return (
    <Card containerStyle={[styles.warningCard, { borderColor: `${colors.warning}40` }]}>
      <View style={styles.cardHeader}>
        <Icon name="warning" type="material" size={24} color={colors.warning} />
        <Text style={[styles.warningTitle, { color: colors.warning }]}>Security Notice</Text>
      </View>
      <Text style={[styles.warningText, { color: colors.textMuted }]}>
        {isAndroid
          ? '• NIP-55 signer apps (Amber) are most secure\n'
          : '• NIP-46 bunkers are most secure for iOS\n'}
        • Never share your private key{'\n'}
        • Use test keys for development only{'\n'}
        • Keys are encrypted and stored securely
      </Text>
    </Card>
  );
}
