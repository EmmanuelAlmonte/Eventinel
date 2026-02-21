export interface IncidentLocation {
  address?: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
}

export interface IncidentData {
  id: string;
  title: string;
  description?: string;
  type: string;
  severity: 1 | 2 | 3 | 4 | 5;
  location: IncidentLocation;
  occurredAt: Date | string;
  source?: string;
}

export interface IncidentCardProps {
  incident: IncidentData;
  onPress?: (incident: IncidentData) => void;
  expanded?: boolean;
  distance?: string;
}

export interface CompactIncidentCardProps {
  incident: IncidentData;
  onPress?: (incident: IncidentData) => void;
}
