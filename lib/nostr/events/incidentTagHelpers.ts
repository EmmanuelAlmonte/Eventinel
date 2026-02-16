/**
 * Tag/geo helpers used by incident event creation/parsing.
 */

export function getTagValue(tags: string[][], tagName: string): string | undefined {
  const tag = tags.find((entry) => entry[0] === tagName);
  return tag?.[1];
}

export function getTagValues(tags: string[][], tagName: string): string[] {
  return tags
    .filter((entry) => entry[0] === tagName)
    .map((entry) => entry[1]);
}

export function parseGeolocation(
  geoTag: string | undefined
): { lat: number; lng: number } | null {
  if (!geoTag) return null;

  const parts = geoTag.split(',');
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export function parseContentLocation(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
