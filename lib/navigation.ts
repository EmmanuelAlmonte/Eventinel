import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  IncidentDetail: { incidentId: string; eventId?: string };
  Relays: undefined;
  Wallet: undefined;
};

export type AppNavigationParamList = RootStackParamList & {
  Map: undefined;
  Incidents: undefined;
  Profile: undefined;
};

export type AppNavigation = NativeStackNavigationProp<AppNavigationParamList>;

// Global navigation ref for components mounted outside screens (e.g. notification bridge).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
