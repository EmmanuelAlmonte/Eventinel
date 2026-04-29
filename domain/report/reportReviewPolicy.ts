export type ReportIncidentType = 'violent_crime' | 'fire' | 'traffic' | 'medical' | 'suspicious' | 'other';
export type ReportSourceTab = 'Map' | 'Incidents';
export type ReportSeverity = 1 | 2 | 3 | 4 | 5;

export const REPORT_TYPE_LABELS: Record<ReportIncidentType, string> = {
  violent_crime: 'Crime',
  fire: 'Fire',
  traffic: 'Traffic',
  medical: 'Medical',
  suspicious: 'Suspicious',
  other: 'Other',
};

const REPORT_TYPE_SEVERITY: Record<ReportIncidentType, ReportSeverity> = {
  violent_crime: 3,
  fire: 4,
  traffic: 2,
  medical: 4,
  suspicious: 2,
  other: 2,
};

export type BuildReportAddressInput = {
  sourceTab?: ReportSourceTab;
  locationNote?: string;
  locationLabel?: string | null;
  hasLocation?: boolean;
};

export type BuildIncidentReportTitleInput = {
  incidentType: ReportIncidentType;
  locationNote?: string;
};

export type CanSubmitReportReviewInput = {
  isSubmitting: boolean;
  connectedRelayCount: number;
  hasLocation: boolean;
  stillActive: boolean | null;
  isWithinRadius: boolean;
};

export function getReportTypeLabel(incidentType: ReportIncidentType) {
  return REPORT_TYPE_LABELS[incidentType];
}

export function getReportTypeSeverity(incidentType: ReportIncidentType) {
  return REPORT_TYPE_SEVERITY[incidentType];
}

export function buildReportAddress({
  sourceTab,
  locationNote,
  locationLabel,
  hasLocation,
}: BuildReportAddressInput) {
  if (locationLabel) {
    return locationLabel;
  }

  const trimmedNote = locationNote?.trim();
  if (trimmedNote) {
    return trimmedNote;
  }

  if (sourceTab === 'Map') {
    return 'Current map area';
  }

  if (sourceTab === 'Incidents') {
    return 'Nearby incident area';
  }

  if (hasLocation) {
    return 'Current location';
  }

  return 'Unknown location';
}

export function buildIncidentReportTitle({
  incidentType,
  locationNote,
}: BuildIncidentReportTitleInput) {
  const typeLabel = getReportTypeLabel(incidentType);
  const trimmedNote = locationNote?.trim();
  if (trimmedNote) {
    return `${typeLabel} near ${trimmedNote}`;
  }

  return `${typeLabel} report`;
}

export function buildReportReviewReturnLabel(sourceTab?: ReportSourceTab) {
  if (sourceTab === 'Incidents') {
    return 'Back to incidents';
  }

  if (sourceTab === 'Map') {
    return 'Back to map';
  }

  return 'Back to app';
}

export function canSubmitReportReview({
  isSubmitting,
  connectedRelayCount,
  hasLocation,
  stillActive,
  isWithinRadius,
}: CanSubmitReportReviewInput) {
  return (
    !isSubmitting &&
    connectedRelayCount > 0 &&
    hasLocation &&
    stillActive !== null &&
    isWithinRadius
  );
}
