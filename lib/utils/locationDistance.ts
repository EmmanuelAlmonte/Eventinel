const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_MILE = 1609.344;

export type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceBetweenCoordinatesMeters(
  from: CoordinatePoint | null | undefined,
  to: CoordinatePoint | null | undefined
): number | null {
  if (!from || !to) {
    return null;
  }

  if (
    !Number.isFinite(from.latitude) ||
    !Number.isFinite(from.longitude) ||
    !Number.isFinite(to.latitude) ||
    !Number.isFinite(to.longitude)
  ) {
    return null;
  }

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLat = lat2 - lat1;
  const dLng = toRadians(to.longitude - from.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const normalizedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA));

  return EARTH_RADIUS_METERS * c;
}

export function formatDistanceMiles(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return '0 mi';
  }

  const miles = distanceMeters / METERS_PER_MILE;
  if (miles < 0.1) {
    return '<0.1 mi';
  }

  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }

  return `${Math.round(miles)} mi`;
}
