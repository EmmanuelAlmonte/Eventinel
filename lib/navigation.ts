import { createNavigationContainerRef } from '@react-navigation/native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type ReportSourceTab = 'Map' | 'Incidents';
export type ReportLocation = { latitude: number; longitude: number };
export type ReportIncidentType = 'violent_crime' | 'fire' | 'traffic' | 'medical' | 'suspicious' | 'other';
export type ReportAdjustOrigin = 'initial_required' | 'report_edit' | 'review_edit';

export type MapIncidentFocus = {
  incidentId: string;
  eventId?: string;
  title?: string;
  coordinate: [number, number];
  requestedAt: number;
};

export type MainTabParamList = {
  Map: { focusIncident?: MapIncidentFocus } | undefined;
  Incidents: undefined;
  Report: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
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

export type AppNavigationParamList = RootStackParamList & MainTabParamList;

export type AppNavigation = NativeStackNavigationProp<AppNavigationParamList>;

// Global navigation ref for components mounted outside screens (e.g. notification bridge).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
