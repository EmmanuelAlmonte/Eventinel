import * as Notifications from 'expo-notifications';

export function permissionLabelFromStatus(status: Notifications.PermissionStatus | null): string {
  if (!status) return 'Unknown';
  switch (status) {
    case Notifications.PermissionStatus.GRANTED:
      return 'Granted';
    case Notifications.PermissionStatus.DENIED:
      return 'Denied';
    default:
      return 'Undetermined';
  }
}
