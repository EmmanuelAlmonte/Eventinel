/**
 * RelayConnectScreen
 *
 * Manage Nostr relay connections with add/remove/reconnect controls.
 */

import { ScreenContainer } from '@components/ui';
import { useAppTheme } from '@hooks';
import { LOCAL_RELAYS } from '@lib/relay/storage';

import {
  AddRelayCard,
  DevRelayToggleCard,
  RelayHeader,
  RelayInfoNote,
  RelayListCard,
  RelayMessageBanner,
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
      <RelayHeader colors={colors} relayCount={relays.length} connectedCount={connectedCount} />

      <AddRelayCard
        colors={colors}
        relayUrl={relayUrl}
        setRelayUrl={setRelayUrl}
        onConnect={() => void handleConnect()}
      />

      <DevRelayToggleCard
        colors={colors}
        localRelays={LOCAL_RELAYS}
        useLocalRelay={useLocalRelay}
        isSwitchingRelay={isSwitchingRelay}
        onToggle={(nextValue) => void handleToggleLocalRelay(nextValue)}
      />

      <RelayMessageBanner colors={colors} message={message} isError={isError} />

      <RelayListCard
        colors={colors}
        relays={relays}
        onReconnect={handleReconnect}
        onDisconnect={handleDisconnect}
      />

      <RelayInfoNote colors={colors} />
    </ScreenContainer>
  );
}
