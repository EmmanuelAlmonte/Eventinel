import { distanceBetweenCoordinatesMeters, formatDistanceMiles } from '@lib/utils/locationDistance';

describe('lib/utils/locationDistance', () => {
  it('returns zero for the same point', () => {
    const distance = distanceBetweenCoordinatesMeters(
      { latitude: 40.03836, longitude: -75.05134 },
      { latitude: 40.03836, longitude: -75.05134 }
    );

    expect(distance).toBe(0);
  });

  it('returns a finite distance for nearby points', () => {
    const distance = distanceBetweenCoordinatesMeters(
      { latitude: 40.03836, longitude: -75.05134 },
      { latitude: 40.04836, longitude: -75.05134 }
    );

    expect(distance).not.toBeNull();
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(1200);
  });

  it('returns null when coordinates are missing', () => {
    expect(distanceBetweenCoordinatesMeters(null, { latitude: 40.0, longitude: -75.0 })).toBeNull();
  });

  it('formats miles for user-facing copy', () => {
    expect(formatDistanceMiles(80)).toBe('<0.1 mi');
    expect(formatDistanceMiles(1609.344)).toBe('1.0 mi');
    expect(formatDistanceMiles(3218.688 * 6)).toBe('12 mi');
  });
});
