import type { ReportLocation } from '@lib/navigation';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function buildRadiusPolygon(
  center: ReportLocation,
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coordinates: [number, number][] = [];
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const lat1 = toRadians(center.latitude);
  const lon1 = toRadians(center.longitude);

  for (let step = 0; step <= steps; step += 1) {
    const bearing = (2 * Math.PI * step) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
      );

    coordinates.push([toDegrees(lon2), toDegrees(lat2)]);
  }

  return {
    type: 'Feature',
    properties: {
      role: 'report-radius',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

export function buildRadiusBounds(center: ReportLocation, radiusMeters: number) {
  const polygon = buildRadiusPolygon(center, radiusMeters, 32);
  const points = polygon.geometry.coordinates[0];

  let minLng = points[0]?.[0] ?? center.longitude;
  let maxLng = minLng;
  let minLat = points[0]?.[1] ?? center.latitude;
  let maxLat = minLat;

  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return {
    ne: [maxLng, maxLat] as [number, number],
    sw: [minLng, minLat] as [number, number],
  };
}

export function getFeatureCoordinate(feature?: GeoJSON.Feature<GeoJSON.Geometry> | null): ReportLocation | null {
  const coordinates = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : null;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}
