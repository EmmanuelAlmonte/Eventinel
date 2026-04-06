/**
 * RelayConnectScreen
 *
 * Manage Nostr relay connections with add/remove/reconnect controls.
 */

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';
import { LOCAL_RELAYS } from '@lib/relay/storage';

import {
  AddRelaySection,
  DeveloperToolsSection,
  RelayHeader,
  RelayInfoNote,
  RelayListSection,
  RelaySummarySection,
} from './relayConnect/RelayConnectSections';
import { useRelayManagement } from './relayConnect/useRelayManagement';

export default function RelayConnectScreen() {
  const { colors } = useAppTheme();
  const {
    relayUrl,
    setRelayUrl,
    relays,
    message,
    useLocalRelay,
    isSwitchingRelay,
    connectedCount,
    isError,
    handleConnect,
    handleDisconnect,
    handleReconnect,
    handleToggleLocalRelay,
  } = useRelayManagement();

  return (
    <ScreenContainer scroll>
      <RelayHeader colors={colors} />

      <RelaySummarySection
        colors={colors}
        relays={relays}
        connectedCount={connectedCount}
        message={message}
        isError={isError}
      />

      <RelayListSection
        colors={colors}
        relays={relays}
        canRemoveRelay={relays.length > 1}
        onReconnect={handleReconnect}
        onDisconnect={handleDisconnect}
      />

      <AddRelaySection
        colors={colors}
        relayUrl={relayUrl}
        setRelayUrl={setRelayUrl}
        canAddRelay={Boolean(relayUrl.trim())}
        onAddRelay={() => void handleConnect()}
      />

      <RelayInfoNote colors={colors} />

      <DeveloperToolsSection
        colors={colors}
        localRelays={LOCAL_RELAYS}
        useLocalRelay={useLocalRelay}
        isSwitchingRelay={isSwitchingRelay}
        onToggle={(nextValue) => void handleToggleLocalRelay(nextValue)}
      />
    </ScreenContainer>
  );
}
