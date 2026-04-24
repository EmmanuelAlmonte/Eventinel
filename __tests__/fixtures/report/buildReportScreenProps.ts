import type { RootStackParamList } from '../../../lib/navigation';

type ReportReviewParams = RootStackParamList['ReportIncidentReview'];
type ReportSubmittedParams = RootStackParamList['ReportIncidentSubmitted'];

type BuildScreenPropsOptions<TParams> = {
  navigation?: Record<string, unknown>;
  params?: Partial<TParams>;
};

export function buildReportReviewScreenProps(
  options: BuildScreenPropsOptions<ReportReviewParams> = {}
) {
  return {
    navigation: {
      replace: jest.fn(),
      reset: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      popToTop: jest.fn(),
      ...options.navigation,
    },
    route: {
      key: 'ReportIncidentReview-key',
      name: 'ReportIncidentReview',
      params: {
        sessionKey: 'session-1',
        ...options.params,
      },
    },
  } as any;
}

export function buildReportSubmittedParams(
  overrides: Partial<ReportSubmittedParams> = {}
): ReportSubmittedParams {
  return {
    incidentType: 'fire',
    locationLabel: '123 Main St, New York, NY',
    relayCount: 2,
    stillActive: true,
    sourceTab: 'Map',
    ...overrides,
  };
}

export function buildReportSubmittedScreenProps(
  options: BuildScreenPropsOptions<ReportSubmittedParams> = {}
) {
  return {
    navigation: {
      popToTop: jest.fn(),
      ...options.navigation,
    },
    route: {
      key: 'ReportIncidentSubmitted-key',
      name: 'ReportIncidentSubmitted',
      params: buildReportSubmittedParams(options.params),
    },
  } as any;
}
