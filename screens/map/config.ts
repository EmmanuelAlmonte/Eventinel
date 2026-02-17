import type { ComponentType } from 'react';

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
export const INCIDENT_LABEL_LAYER_ID = 'incident-point-labels';
export const CLUSTER_RADIUS = 52;

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

export const incidentLabelStyle = {
  textField: ['to-string', ['get', 'severity']] as const,
  textSize: INCIDENT_MARKER.TEXT_FONT_SIZE,
  textColor: INCIDENT_MARKER.TEXT_COLOR,
  textAllowOverlap: true,
  textIgnorePlacement: true,
  textAnchor: 'center' as const,
};
