import geohash from 'ngeohash';

import type { LngLat } from './geohashViewport';

const EARTH_RADIUS_METERS = 6371000;

export function isFiniteLngLat(value: LngLat | null | undefined): value is LngLat {
  return (
    !!value &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 90 &&
    Math.abs(value[0]) <= 180
  );
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMetersFromCoordinates(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a =
    sinLat * sinLat +
    Math.cos(radLat1) * Math.cos(radLat2) * sinLng * sinLng;
  const normalizedA = Math.min(1, Math.max(0, a));

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(normalizedA), Math.sqrt(1 - normalizedA));
}

function cellDistanceToCenter(cell: string, center: LngLat): number {
  const [lng, lat] = center;
  try {
    const decoded = geohash.decode(cell);
    return distanceMetersFromCoordinates(lat, lng, decoded.latitude, decoded.longitude);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function sortCellsByProximity(cells: string[], center: LngLat): string[] {
  return [...new Set(cells)].sort((left, right) => {
    const leftDistance = cellDistanceToCenter(left, center);
    const rightDistance = cellDistanceToCenter(right, center);

    if (leftDistance === rightDistance) {
      return left.localeCompare(right);
    }
    return leftDistance - rightDistance;
  });
}

function toNeighborArray(neighbors: string[] | Record<string, string>): string[] {
  if (Array.isArray(neighbors)) {
    return neighbors.filter((neighbor): neighbor is string => typeof neighbor === 'string');
  }

  return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
    .map((key) => neighbors[key])
    .filter((neighbor): neighbor is string => typeof neighbor === 'string' && neighbor.length > 0);
}

export function expandCellsByRing(cells: string[], ring: number, center: LngLat): string[] {
  const radius = Math.max(0, Math.floor(ring));
  if (radius <= 0 || cells.length === 0) {
    return [];
  }

  const base = new Set(uniqueSorted(cells));
  const visited = new Set<string>(base);
  let frontier = new Set(base);

  for (let step = 0; step < radius; step += 1) {
    const next = new Set<string>();
    for (const cell of frontier) {
      const neighbors = geohash.neighbors(cell);
      const neighborValues = toNeighborArray(neighbors);
      for (const neighbor of neighborValues) {
        if (!neighbor || visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        next.add(neighbor);
      }
    }

    frontier = next;
    if (frontier.size === 0) {
      break;
    }
  }

  for (const cell of base) {
    visited.delete(cell);
  }

  return sortCellsByProximity(Array.from(visited), center);
}
