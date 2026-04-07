import {
  getReportRadiusState,
  REPORT_RADIUS_METERS,
  REPORT_RADIUS_MILES,
} from '@lib/utils/reportLocationRadius';

describe('lib/utils/reportLocationRadius', () => {
  it('allows reports within the half-mile radius', () => {
    const state = getReportRadiusState(
      { latitude: 40.03836, longitude: -75.05134 },
      { latitude: 40.04436, longitude: -75.05134 }
    );

    expect(state.isWithinRadius).toBe(true);
    expect(state.status).toBe('within_radius');
    expect(state.distanceMeters).toBeLessThan(REPORT_RADIUS_METERS);
    expect(state.message).toBe('Within half a mile of your current location.');
  });

  it('blocks reports outside the half-mile radius', () => {
    const state = getReportRadiusState(
      { latitude: 40.03836, longitude: -75.05134 },
      { latitude: 40.08836, longitude: -75.05134 }
    );

    expect(state.isWithinRadius).toBe(false);
    expect(state.status).toBe('out_of_range');
    expect(state.distanceMeters).toBeGreaterThan(REPORT_RADIUS_METERS);
    expect(state.message).toContain('Reports must be created within half a mile of your current location.');
  });

  it('blocks reports when the current device location is unavailable', () => {
    const state = getReportRadiusState(null, { latitude: 40.03836, longitude: -75.05134 });

    expect(state.isWithinRadius).toBe(false);
    expect(state.status).toBe('missing_device_location');
    expect(state.message).toBe('Current location is required to verify this report.');
  });
});
