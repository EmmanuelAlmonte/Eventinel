import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Main: undefined;
  IncidentDetail: { incidentId: string; eventId?: string };
  Relays: undefined;
  Wallet: undefined;
};

// Global navigation ref for components mounted outside screens (e.g. notification bridge).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
