import { REPORT_RADIUS_METERS } from '@lib/utils/reportLocationRadius';
import { buildRadiusBounds, buildRadiusPolygon, getFeatureCoordinate } from '@screens/reportIncident/adjustMapGeometry';

describe('reportIncident adjust map geometry', () => {
  it('builds a closed radius polygon around the anchor point', () => {
    const polygon = buildRadiusPolygon({ latitude: 40.03836, longitude: -75.05134 }, REPORT_RADIUS_METERS);

    expect(polygon.geometry.type).toBe('Polygon');
    expect(polygon.geometry.coordinates[0]).toHaveLength(65);
    expect(polygon.geometry.coordinates[0][0]).toEqual(
      polygon.geometry.coordinates[0][polygon.geometry.coordinates[0].length - 1]
    );
  });

  it('builds bounds that contain the center point', () => {
    const center = { latitude: 40.03836, longitude: -75.05134 };
    const bounds = buildRadiusBounds(center, REPORT_RADIUS_METERS);

    expect(bounds.sw[0]).toBeLessThan(center.longitude);
    expect(bounds.ne[0]).toBeGreaterThan(center.longitude);
    expect(bounds.sw[1]).toBeLessThan(center.latitude);
    expect(bounds.ne[1]).toBeGreaterThan(center.latitude);
  });

  it('extracts a report location from a point feature', () => {
    const point = getFeatureCoordinate({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [-75.05134, 40.03836],
      },
    });

    expect(point).toEqual({
      latitude: 40.03836,
      longitude: -75.05134,
    });
  });
});
