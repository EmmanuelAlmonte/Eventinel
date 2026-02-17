/**
 * IncidentDetailScreen
 *
 * Incident detail view with mini map, details, and community comments.
 */

import { useCallback } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import { type AppNavigation, type RootStackParamList } from '@lib/navigation';
import { useAppTheme } from '@hooks';

import { IncidentDetailLoadingState } from './incidentDetail/IncidentDetailLoadingState';
import { IncidentDetailScreenView } from './incidentDetail/IncidentDetailScreenView';
import { useIncidentCommentsController } from './incidentDetail/useIncidentCommentsController';
import { useIncidentRecord } from './incidentDetail/useIncidentRecord';

export default function IncidentDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'IncidentDetail'>>();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const currentUser = useNDKCurrentUser();
  const currentUserIdentity = currentUser ? { pubkey: currentUser.pubkey } : null;
  const { incident, showNotFound } = useIncidentRecord({
    incidentId: route.params?.incidentId,
    eventId: route.params?.eventId,
  });
  const comments = useIncidentCommentsController(incident, currentUserIdentity);

  const handleShare = useCallback(async () => {
    if (!incident) return;
    try {
      await Share.share({
        message: `"${incident.title}" at ${incident.location.address} — via Eventinel`,
        title: incident.title,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [incident]);

  const handleDirections = useCallback(() => {
    if (!incident) return;

    const { lat, lng } = incident.location;
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(incident.title)})`,
    });

    if (url) {
      Linking.openURL(url).catch((error) => console.error('Could not open maps:', error));
    }
  }, [incident]);

  if (!incident) {
    return (
      <IncidentDetailLoadingState
        colors={colors}
        insets={insets}
        showNotFound={showNotFound}
        onBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <IncidentDetailScreenView
      colors={colors}
      insets={insets}
      incident={incident}
      currentUser={currentUserIdentity}
      comments={comments}
      onBack={() => navigation.goBack()}
      onShare={handleShare}
      onDirections={handleDirections}
    />
  );
}
