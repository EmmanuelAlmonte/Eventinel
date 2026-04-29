import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Card, Icon, Input, Text } from '@rneui/themed';
import type { SignerAppInfo } from 'expo-nip55';
import { automationTestID } from '@lib/utils';

import { LoginActionButton } from './LoginActionButton';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';
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

export type LoginMethod = 'signer' | 'nostrConnect' | 'privateKey';

type UnifiedAuthCardProps = {
  colors: ThemeColors;
  selectedMethod: LoginMethod;
  onSelectMethod: (method: LoginMethod) => void;
  isAndroid: boolean;
  apps: SignerAppInfo[];
  remoteSignerInput: string;
  setRemoteSignerInput: (value: string) => void;
  forceLegacyNip04: boolean;
  setForceLegacyNip04: (value: boolean) => void;
  nostrConnectRelay: string;
  setNostrConnectRelay: (value: string) => void;
  manualKey: string;
  setManualKey: (value: string) => void;
  isLoading: boolean;
  onNip55Login: (app: SignerAppInfo) => void;
  onRemoteSignerLogin: () => void;
  onGenerateNostrConnect: () => void;
  onGenerateKey: () => void;
  onManualLogin: () => void;
};

const LOGIN_METHODS: SegmentedOption<LoginMethod>[] = [
  {
    key: 'signer',
    label: 'Signer app',
    subtitle: 'Remote signer',
  },
  {
    key: 'nostrConnect',
    label: 'Nostr Connect',
    subtitle: 'URI flow',
  },
  {
    key: 'privateKey',
    label: 'Private key',
    subtitle: 'Direct sign in',
  },
];

function AuthBodyHeader({
  colors,
  title,
  subtitle,
  description,
  accentColor,
}: {
  colors: ThemeColors;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
}) {
  return (
    <View style={styles.authBodyHeader}>
      <Text style={[styles.authTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.authSublabel, { color: accentColor }]}>{subtitle}</Text>
      <Text style={[styles.authDescription, { color: colors.textMuted }]}>{description}</Text>
    </View>
  );
}

function AdvancedOptions({
  colors,
  isVisible,
  onToggle,
  forceLegacyNip04,
  setForceLegacyNip04,
  isLoading,
}: {
  colors: ThemeColors;
  isVisible: boolean;
  onToggle: () => void;
  forceLegacyNip04: boolean;
  setForceLegacyNip04: (value: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <View style={styles.advancedSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isVisible }}
        onPress={onToggle}
        style={styles.advancedToggle}
      >
        <Text style={[styles.advancedToggleText, { color: colors.textMuted }]}>Advanced options</Text>
        <Icon
          name={isVisible ? 'expand-less' : 'expand-more'}
          type="material"
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {isVisible ? (
        <View style={[styles.advancedPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>
              Legacy NIP-04 (if bunker does not support NIP-44)
            </Text>
            <Switch
              value={forceLegacyNip04}
              onValueChange={setForceLegacyNip04}
              disabled={isLoading}
              trackColor={{ false: `${colors.textMuted}33`, true: `${colors.primary}66` }}
              thumbColor={forceLegacyNip04 ? colors.primary : '#F4F4F5'}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SignerMethodBody({
  colors,
  isAndroid,
  apps,
  remoteSignerInput,
  setRemoteSignerInput,
  forceLegacyNip04,
  setForceLegacyNip04,
  isLoading,
  onNip55Login,
  onRemoteSignerLogin,
}: {
  colors: ThemeColors;
  isAndroid: boolean;
  apps: SignerAppInfo[];
  remoteSignerInput: string;
  setRemoteSignerInput: (value: string) => void;
  forceLegacyNip04: boolean;
  setForceLegacyNip04: (value: boolean) => void;
  isLoading: boolean;
  onNip55Login: (app: SignerAppInfo) => void;
  onRemoteSignerLogin: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <AuthBodyHeader
        colors={colors}
        title="Signer app"
        subtitle="Recommended"
        description="Use a bunker URI or NIP-05 to connect a signer securely."
        accentColor={colors.primary}
      />

      {isAndroid && apps.length > 0 ? (
        <View style={[styles.inlineNotice, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.inlineNoticeTitle, { color: colors.text }]}>Installed signer apps</Text>
          <Text style={[styles.inlineNoticeText, { color: colors.textMuted }]}>
            You can use an installed signer directly, or connect a bunker URI below.
          </Text>
          <View style={styles.installedSignerActions}>
            {apps.map((app) => (
              <LoginActionButton
                key={app.packageName}
                colors={colors}
                label={app.name || app.packageName}
                onPress={() => onNip55Login(app)}
                disabled={isLoading}
                iconName="key"
                variant="secondary"
              />
            ))}
          </View>
        </View>
      ) : null}

      <Input
        placeholder="bunker://pubkey?relay=wss://... or name@domain"
        value={remoteSignerInput}
        onChangeText={setRemoteSignerInput}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={isLoading}
        leftIcon={<Icon name="link" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <LoginActionButton
        colors={colors}
        label="Connect signer"
        onPress={onRemoteSignerLogin}
        disabled={isLoading}
        iconName="login"
        variant="primary"
      />

      <AdvancedOptions
        colors={colors}
        isVisible={showAdvanced}
        onToggle={() => setShowAdvanced((current: boolean) => !current)}
        forceLegacyNip04={forceLegacyNip04}
        setForceLegacyNip04={setForceLegacyNip04}
        isLoading={isLoading}
      />
    </>
  );
}

function NostrConnectMethodBody({
  colors,
  nostrConnectRelay,
  setNostrConnectRelay,
  isLoading,
  onGenerate,
}: {
  colors: ThemeColors;
  nostrConnectRelay: string;
  setNostrConnectRelay: (value: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
}) {
  return (
    <>
      <AuthBodyHeader
        colors={colors}
        title="Nostr Connect"
        subtitle="Connect using a URI"
        description="Generate a nostrconnect URI and open it in your signer app."
        accentColor={colors.primary}
      />

      <Input
        placeholder="wss://relay.example.com"
        value={nostrConnectRelay}
        onChangeText={setNostrConnectRelay}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={isLoading}
        leftIcon={<Icon name="dns" type="material" size={20} color={colors.textMuted} />}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
        inputStyle={[styles.inputText, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />

      <LoginActionButton
        colors={colors}
        label="Generate Nostr Connect"
        onPress={onGenerate}
        disabled={isLoading}
        iconName="qr-code"
        variant="primary"
      />
    </>
  );
}

function PrivateKeyMethodBody({
  colors,
  manualKey,
  setManualKey,
  isLoading,
  onGenerate,
  onLogin,
}: {
  colors: ThemeColors;
  manualKey: string;
  setManualKey: (value: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onLogin: () => void;
}) {
  return (
    <>
      <AuthBodyHeader
        colors={colors}
        title="Private key"
        subtitle="Sign in directly"
        description="Use a private key directly to sign in."
        accentColor={colors.text}
      />

      <View style={[styles.warningPanel, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}35` }]}>
        <Icon name="warning-amber" type="material" size={18} color={colors.warning} />
        <View style={styles.warningBody}>
          <Text style={[styles.warningPanelTitle, { color: colors.warning }]}>Use carefully</Text>
          <Text style={[styles.warningPanelText, { color: colors.textMuted }]}>
            Never paste a private key you do not control.
          </Text>
        </View>
      </View>

      <Input
        testID={automationTestID('login-private-key-input')}
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

      <View style={styles.privateKeyActions}>
        <LoginActionButton
          testID={automationTestID('login-generate-key')}
          colors={colors}
          label="Generate key"
          onPress={onGenerate}
          disabled={isLoading}
          iconName="add-circle-outline"
          variant="warning"
          containerStyle={styles.privateKeySecondaryAction}
        />
        <LoginActionButton
          testID={automationTestID('login-private-key-submit')}
          colors={colors}
          label="Continue with private key"
          onPress={onLogin}
          disabled={isLoading}
          iconName="key"
          variant="neutral"
          containerStyle={styles.privateKeyPrimaryAction}
        />
      </View>
    </>
  );
}

export function UnifiedAuthCard({
  colors,
  selectedMethod,
  onSelectMethod,
  isAndroid,
  apps,
  remoteSignerInput,
  setRemoteSignerInput,
  forceLegacyNip04,
  setForceLegacyNip04,
  nostrConnectRelay,
  setNostrConnectRelay,
  manualKey,
  setManualKey,
  isLoading,
  onNip55Login,
  onRemoteSignerLogin,
  onGenerateNostrConnect,
  onGenerateKey,
  onManualLogin,
}: UnifiedAuthCardProps) {
  return (
    <Card containerStyle={[styles.card, styles.authCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SegmentedControl
        colors={colors}
        options={LOGIN_METHODS}
        value={selectedMethod}
        onChange={onSelectMethod}
        style={styles.segmentedControl}
      />

      <View style={styles.authBody}>
        {selectedMethod === 'signer' ? (
          <SignerMethodBody
            colors={colors}
            isAndroid={isAndroid}
            apps={apps}
            remoteSignerInput={remoteSignerInput}
            setRemoteSignerInput={setRemoteSignerInput}
            forceLegacyNip04={forceLegacyNip04}
            setForceLegacyNip04={setForceLegacyNip04}
            isLoading={isLoading}
            onNip55Login={onNip55Login}
            onRemoteSignerLogin={onRemoteSignerLogin}
          />
        ) : null}

        {selectedMethod === 'nostrConnect' ? (
          <NostrConnectMethodBody
            colors={colors}
            nostrConnectRelay={nostrConnectRelay}
            setNostrConnectRelay={setNostrConnectRelay}
            isLoading={isLoading}
            onGenerate={onGenerateNostrConnect}
          />
        ) : null}

        {selectedMethod === 'privateKey' ? (
          <PrivateKeyMethodBody
            colors={colors}
            manualKey={manualKey}
            setManualKey={setManualKey}
            isLoading={isLoading}
            onGenerate={onGenerateKey}
            onLogin={onManualLogin}
          />
        ) : null}
      </View>

      <View style={[styles.helpDivider, { borderTopColor: colors.border }]} />
      <View style={styles.helpNote}>
        <Text style={[styles.helpNoteTitle, { color: colors.text }]}>Need help choosing?</Text>
        <Text style={[styles.helpNoteText, { color: colors.textMuted }]}>
          Use a signer app if you're new to Nostr.
        </Text>
      </View>
    </Card>
  );
}
