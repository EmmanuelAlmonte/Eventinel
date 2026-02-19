import type { ComponentType } from 'react';

import type { IncidentType } from '@lib/nostr/config';
import { SEVERITY_COLORS } from '@lib/map/types';
import { INCIDENT_MARKER } from '@lib/map/constants';

export type CameraAnimationMode = 'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none';

export type MapState = {
  gestures?: {
    isGestureActive?: boolean;
  };
  properties?: {
    zoom?: number;
    zoomLevel?: number;
    camera?: {
      zoom?: number;
      zoomLevel?: number;
    };
  };
};

export type ShapeSourceFeatureProperties = {
  incidentId?: string;
  cluster?: boolean;
};

export type ShapeSourcePressEvent = {
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, ShapeSourceFeatureProperties>>;
};

export type MapboxModule = {
  MapView: ComponentType<Record<string, unknown>>;
  Camera: ComponentType<Record<string, unknown>>;
  Images: ComponentType<Record<string, unknown>>;
  PointAnnotation: ComponentType<Record<string, unknown>>;
  ShapeSource: ComponentType<Record<string, unknown>>;
  CircleLayer: ComponentType<Record<string, unknown>>;
  SymbolLayer: ComponentType<Record<string, unknown>>;
};

export type CameraRef = {
  setCamera: (params: {
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    animationMode?: CameraAnimationMode;
    animationDuration?: number;
  }) => void;
};

export type ShapeSourceRef = {
  getClusterExpansionZoom: (feature: ShapeSourcePressEvent['features'][number]) => Promise<number> | number;
};

function getMapboxModule(): MapboxModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleValue = require('@rnmapbox/maps');
    return (moduleValue?.default ?? moduleValue) as MapboxModule;
  } catch (error) {
    if (__DEV__) {
      console.warn('[MapScreen] @rnmapbox/maps not available in this runtime', error);
    }
    return null;
  }
}

export const Mapbox = getMapboxModule();

export const FLY_TO_DURATION = 1500;
export const AUTO_RESUME_DELAY_MS = 20000;
export const INCIDENT_SOURCE_ID = 'incidents-source';
export const CLUSTER_LAYER_ID = 'incident-clusters';
export const CLUSTER_COUNT_LAYER_ID = 'incident-cluster-count';
export const INCIDENT_LAYER_ID = 'incident-points';
export const INCIDENT_ICON_LAYER_ID = 'incident-point-icons';
export const CLUSTER_RADIUS = 52;
export const CLUSTER_MAX_ZOOM_LEVEL = 12;

export const clusterFilter = ['has', 'point_count'] as const;
export const pointFilter = ['!', ['has', 'point_count']] as const;

export const incidentCircleStyle = {
  circleColor: [
    'match',
    ['get', 'severity'],
    1,
    SEVERITY_COLORS[1],
    2,
    SEVERITY_COLORS[2],
    3,
    SEVERITY_COLORS[3],
    4,
    SEVERITY_COLORS[4],
    5,
    SEVERITY_COLORS[5],
    SEVERITY_COLORS[1],
  ] as const,
  circleRadius: INCIDENT_MARKER.PIN_SIZE / 2,
  circleStrokeColor: INCIDENT_MARKER.PIN_BORDER_COLOR,
  circleStrokeWidth: INCIDENT_MARKER.PIN_BORDER_WIDTH,
  circleOpacity: 0.95,
};

const INCIDENT_TYPE_ICON_KEYS: Record<IncidentType, string> = {
  fire: 'incident-icon-fire',
  medical: 'incident-icon-medical',
  traffic: 'incident-icon-traffic',
  violent_crime: 'incident-icon-violent-crime',
  property_crime: 'incident-icon-property-crime',
  disturbance: 'incident-icon-disturbance',
  suspicious: 'incident-icon-suspicious',
  other: 'incident-icon-other',
};

export const incidentIconImages = {
  [INCIDENT_TYPE_ICON_KEYS.fire]: require('../../assets/Icons/64/fire.png'),
  [INCIDENT_TYPE_ICON_KEYS.medical]: require('../../assets/Icons/64/medical.png'),
  [INCIDENT_TYPE_ICON_KEYS.traffic]: require('../../assets/Icons/64/traffic.png'),
  [INCIDENT_TYPE_ICON_KEYS.violent_crime]: require('../../assets/Icons/64/violent_crime.png'),
  [INCIDENT_TYPE_ICON_KEYS.property_crime]: require('../../assets/Icons/64/property_crime.png'),
  [INCIDENT_TYPE_ICON_KEYS.disturbance]: require('../../assets/Icons/64/disturbance.png'),
  [INCIDENT_TYPE_ICON_KEYS.suspicious]: require('../../assets/Icons/64/suspicious.png'),
  [INCIDENT_TYPE_ICON_KEYS.other]: require('../../assets/Icons/64/other.png'),
} as const;

export const incidentIconStyle = {
  iconImage: [
    'match',
    ['get', 'incidentType'],
    'fire',
    INCIDENT_TYPE_ICON_KEYS.fire,
    'medical',
    INCIDENT_TYPE_ICON_KEYS.medical,
    'traffic',
    INCIDENT_TYPE_ICON_KEYS.traffic,
    'violent_crime',
    INCIDENT_TYPE_ICON_KEYS.violent_crime,
    'property_crime',
    INCIDENT_TYPE_ICON_KEYS.property_crime,
    'disturbance',
    INCIDENT_TYPE_ICON_KEYS.disturbance,
    'suspicious',
    INCIDENT_TYPE_ICON_KEYS.suspicious,
    INCIDENT_TYPE_ICON_KEYS.other,
  ] as const,
  iconSize: 0.45,
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  iconAnchor: 'center' as const,
};
