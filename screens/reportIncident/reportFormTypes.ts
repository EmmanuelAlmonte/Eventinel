import type { useAppTheme } from '@hooks';
import type { getReportRadiusState } from '@lib/utils/reportLocationRadius';

export type ReportFormColors = ReturnType<typeof useAppTheme>['colors'];
export type ReportRadiusState = ReturnType<typeof getReportRadiusState>;
