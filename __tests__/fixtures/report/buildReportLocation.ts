import type { ReportLocation } from '../../../lib/navigation';

type ReportPointFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

export type ReverseGeocodeResultFixture = {
  streetNumber: string | null;
  street: string | null;
  district: string | null;
  city: string | null;
  region: string | null;
};

export type ResolvedReportLocationFixture = {
  resolvedPlaceLabel: string | null;
  resolvedContextLine: string | null;
  isResolvingPlace: boolean;
};

export function buildReportLocation(overrides: Partial<ReportLocation> = {}): ReportLocation {
  return {
    latitude: 40.03836,
    longitude: -75.05134,
    ...overrides,
  };
}

export function buildNearbyReportLocation(
  overrides: Partial<ReportLocation> = {}
): ReportLocation {
  return buildReportLocation({
    latitude: 40.04436,
    ...overrides,
  });
}

export function buildOutOfRangeReportLocation(
  overrides: Partial<ReportLocation> = {}
): ReportLocation {
  return buildReportLocation({
    latitude: 40.08836,
    ...overrides,
  });
}

export function buildReportPointFeature(
  location: ReportLocation = buildReportLocation()
): ReportPointFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    },
  };
}

export function buildResolvedReportLocation(
  overrides: Partial<ResolvedReportLocationFixture> = {}
): ResolvedReportLocationFixture {
  return {
    resolvedPlaceLabel: '3100 block Princeton Avenue',
    resolvedContextLine: 'Philadelphia, Pennsylvania',
    isResolvingPlace: false,
    ...overrides,
  };
}

export function buildReverseGeocodeResult(
  overrides: Partial<ReverseGeocodeResultFixture> = {}
): ReverseGeocodeResultFixture {
  return {
    streetNumber: '3127',
    street: 'Princeton Avenue',
    district: null,
    city: 'Philadelphia',
    region: 'PA',
    ...overrides,
  };
}
