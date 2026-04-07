import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type ReportSourceTab = 'Map' | 'Incidents';
export type ReportLocation = { latitude: number; longitude: number };
export type ReportIncidentType = 'violent_crime' | 'fire' | 'traffic' | 'medical' | 'suspicious' | 'other';

export type RootStackParamList = {
  Main: undefined;
  IncidentDetail: { incidentId: string; eventId?: string };
  Relays: undefined;
  ReportIncident: {
    sourceTab?: ReportSourceTab;
    location?: ReportLocation | null;
    incidentType?: ReportIncidentType | null;
    description?: string;
    locationNote?: string;
    editTarget?: 'location' | 'details';
  };
  ReportIncidentReview: {
    sourceTab?: ReportSourceTab;
    location?: ReportLocation | null;
    incidentType: ReportIncidentType;
    description: string;
    locationNote?: string;
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
