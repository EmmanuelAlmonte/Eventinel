import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type ReportSourceTab = 'Map' | 'Incidents';
export type ReportLocation = { latitude: number; longitude: number };
export type ReportIncidentType = 'violent_crime' | 'fire' | 'traffic' | 'medical' | 'suspicious' | 'other';
export type ReportAdjustOrigin = 'initial_required' | 'report_edit' | 'review_edit';

export type RootStackParamList = {
  Main: undefined;
  IncidentDetail: { incidentId: string; eventId?: string };
  Relays: undefined;
  ReportIncident: {
    sessionKey: string;
  };
  ReportIncidentAdjustLocation: {
    origin: ReportAdjustOrigin;
    sessionKey: string;
  };
  ReportIncidentReview: {
    sessionKey: string;
  };
  ReportIncidentSubmitted: {
    sourceTab?: ReportSourceTab;
    incidentType: ReportIncidentType;
    locationLabel: string;
    relayCount: number;
    stillActive: boolean;
  };
  Wallet: undefined;
};

export type AppNavigationParamList = RootStackParamList & {
  Map: undefined;
  Incidents: undefined;
  Report: undefined;
  Profile: undefined;
};

export type AppNavigation = NativeStackNavigationProp<AppNavigationParamList>;

// Global navigation ref for components mounted outside screens (e.g. notification bridge).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
