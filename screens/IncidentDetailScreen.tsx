/**
 * IncidentDetailScreen
 *
 * Incident detail view with mini map, details, and community comments.
 */

import { useCallback, useEffect } from 'react';
import { InteractionManager, Linking, Platform, Share } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNDKCurrentUser } from '@nostr-dev-kit/mobile';

import { type AppNavigation, type RootStackParamList } from '@lib/navigation';
import { useAppTheme } from '@hooks';
import {
  completeIncidentNavTrace,
  markIncidentNavTrace,
} from '@lib/debug/incidentNavigationTrace';

import { IncidentDetailLoadingState } from './incidentDetail/IncidentDetailLoadingState';
import { IncidentDetailScreenView } from './incidentDetail/IncidentDetailScreenView';
import { useIncidentCommentsController } from './incidentDetail/useIncidentCommentsController';
import { useIncidentRecord } from './incidentDetail/useIncidentRecord';

export default function IncidentDetailScreen() {
  const navigation = useNavigation<AppNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'IncidentDetail'>>();
  const routeIncidentId = route.params?.incidentId;
  const routeEventId = route.params?.eventId;
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const currentUser = useNDKCurrentUser();
  const currentUserIdentity = currentUser ? { pubkey: currentUser.pubkey } : null;
  const { incident, showNotFound } = useIncidentRecord({
    incidentId: route.params?.incidentId,
    eventId: route.params?.eventId,
  });
  const comments = useIncidentCommentsController(incident, currentUserIdentity);

  useEffect(() => {
    if (!routeIncidentId) {
      return;
    }

    let hasFirstFrame = false;
    let hasAfterInteractions = false;
    let completed = false;

    const maybeCompleteTrace = () => {
      if (completed || !hasFirstFrame || !hasAfterInteractions) {
        return;
      }
      completed = true;
      completeIncidentNavTrace({
        incidentId: routeIncidentId,
        eventId: routeEventId,
        stage: 'detail.after-interactions',
      });
    };

    markIncidentNavTrace({
      incidentId: routeIncidentId,
      eventId: routeEventId,
      stage: 'detail.screen.mount',
    });

    const frameHandle = requestAnimationFrame(() => {
      hasFirstFrame = true;
      markIncidentNavTrace({
        incidentId: routeIncidentId,
        eventId: routeEventId,
        stage: 'detail.first-frame',
      });
      maybeCompleteTrace();
    });

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      hasAfterInteractions = true;
      markIncidentNavTrace({
        incidentId: routeIncidentId,
        eventId: routeEventId,
        stage: 'detail.after-interactions.ready',
      });
      maybeCompleteTrace();
    });

    return () => {
      cancelAnimationFrame(frameHandle);
      interactionHandle.cancel?.();
    };
  }, [routeEventId, routeIncidentId]);

  useEffect(() => {
    if (!incident) {
      return;
    }

    markIncidentNavTrace({
      incidentId: incident.incidentId,
      eventId: routeEventId,
      stage: 'detail.incident.available',
      meta: {
        severity: incident.severity,
        source: incident.source,
      },
    });
  }, [incident, routeEventId]);

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
