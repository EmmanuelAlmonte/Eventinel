/**
 * MapScreen fallback-state screens.
 */

import { Text } from '@rneui/themed';
import { ScreenContainer, LocationRequiredEmpty } from '@components/ui';
import type { LocationPermissionStatus } from './useMapScreenState';
import { mapScreenStyles as styles } from './styles';

export function MapScreenUnavailable() {
  return (
    <ScreenContainer centerContent>
      <Text style={styles.mapUnavailableTitle}>Map unavailable in this build</Text>
      <Text style={styles.mapUnavailableSubtitle}>
        Reload using the custom dev client build that includes Mapbox native modules.
      </Text>
    </ScreenContainer>
  );
}

export function MapScreenLocationRequired({
  permission,
  onRetry,
}: {
  permission: LocationPermissionStatus;
  onRetry: () => void;
}) {
  return (
    <ScreenContainer>
      <LocationRequiredEmpty permission={permission ?? 'undetermined'} onRetry={onRetry} />
    </ScreenContainer>
  );
}
