import type { ReportLocation } from '../../../lib/navigation';

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
