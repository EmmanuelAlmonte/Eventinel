/**
 * IncidentFeedScreen
 *
 * List view of nearby incidents using the shared subscription context.
 */

import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@rneui/themed';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { type AppNavigation } from '@lib/navigation';
import { automationTestID } from '@lib/utils';
import { useAppTheme } from '@hooks';
import type { ProcessedIncident } from '@hooks';
import { useRelayStatus, useSharedLocation, useSharedIncidents } from '@contexts';
import { LocationRequiredEmpty, ScreenContainer, SkeletonList } from '@components/ui';
import {
  markIncidentNavTrace,
  startIncidentNavTrace,
} from '@lib/debug/incidentNavigationTrace';

import { IncidentFeedContent } from './incidentFeed/IncidentFeedContent';
import { IncidentRow } from './incidentFeed/IncidentRow';
import { buildRelayBannerStatus, formatRelayList } from './incidentFeed/helpers';
import { incidentFeedStyles as styles } from './incidentFeed/styles';

const EMPTY_INCIDENTS: ProcessedIncident[] = [];
const FOCUS_LIST_ACTIVATION_DELAY_MS = 250;

export default function IncidentFeedScreen() {
  const navigation = useNavigation<AppNavigation>();
  const isFocused = useIsFocused();
  const { colors } = useAppTheme();
  const { hasConnectedRelay, hasRelays, isConnecting, relays } = useRelayStatus();
  const { location: userLocation, isLoading: isLoadingLocation, permission, refresh } = useSharedLocation();
  const { incidents, hasReceivedHistory, setFeedFocused } = useSharedIncidents();
  const [isIncidentListActive, setIsIncidentListActive] = useState(false);

  useEffect(() => {
    setFeedFocused(isFocused);
    return () => setFeedFocused(false);
  }, [isFocused, setFeedFocused]);

  useEffect(() => {
    if (!isFocused) {
      setIsIncidentListActive(false);
      return;
    }

    setIsIncidentListActive(false);
    const timer = setTimeout(() => {
      setIsIncidentListActive(true);
    }, FOCUS_LIST_ACTIVATION_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isFocused]);

  const visibleIncidents = isFocused && isIncidentListActive ? incidents : EMPTY_INCIDENTS;
  const feedHasReceivedHistory = isIncidentListActive ? hasReceivedHistory : false;
  const handleIncidentPress = useCallback(
    (incidentId: string) => {
      startIncidentNavTrace({
        incidentId,
        source: 'incident-feed',
        stage: 'feed.incident.press.start',
      });
      markIncidentNavTrace({
        incidentId,
        source: 'incident-feed',
        stage: 'feed.navigate.before',
      });
      navigation.navigate('IncidentDetail', { incidentId });
      markIncidentNavTrace({
        incidentId,
        source: 'incident-feed',
        stage: 'feed.navigate.after',
      });
    },
    [navigation]
  );
  const handleRelaySettings = useCallback(() => navigation.navigate('Relays'), [navigation]);

  const relayLabel = formatRelayList(relays.map((relay) => relay.url));
  const relayStatus = buildRelayBannerStatus({
    hasConnectedRelay,
    hasRelays,
    isConnecting,
    relayLabel,
  });

  const renderIncidentItem = useCallback(
    ({ item }: { item: ProcessedIncident }) => (
      <IncidentRow incident={item} colors={colors} onPress={handleIncidentPress} />
    ),
    [colors, handleIncidentPress]
  );

  if (isLoadingLocation) {
    return (
      <ScreenContainer testID={automationTestID('screen-incidents')}>
        <View style={styles.header}>
          <Text h2 style={[styles.title, { color: colors.text }]}>Incidents</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Finding your location...
          </Text>
        </View>
        <SkeletonList count={4} />
      </ScreenContainer>
    );
  }

  if (!userLocation) {
    return (
      <ScreenContainer testID={automationTestID('screen-incidents')}>
        <LocationRequiredEmpty permission={permission} onRetry={() => void refresh()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID={automationTestID('screen-incidents')}>
      <IncidentFeedContent
        colors={colors}
        visibleIncidents={visibleIncidents}
        hasReceivedHistory={feedHasReceivedHistory}
        relayStatus={relayStatus}
        hasRelays={hasRelays}
        onRelaySettings={handleRelaySettings}
        renderIncidentItem={renderIncidentItem}
      />
    </ScreenContainer>
  );
}
