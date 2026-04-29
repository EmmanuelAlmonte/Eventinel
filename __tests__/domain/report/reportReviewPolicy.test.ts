import {
  buildIncidentReportTitle,
  buildReportAddress,
  buildReportReviewReturnLabel,
  canSubmitReportReview,
  getReportTypeLabel,
  getReportTypeSeverity,
} from '../../../domain/report';

describe('reportReviewPolicy', () => {
  describe('incident type labels and severities', () => {
    it('maps report types to user-facing labels', () => {
      expect(getReportTypeLabel('violent_crime')).toBe('Crime');
      expect(getReportTypeLabel('fire')).toBe('Fire');
      expect(getReportTypeLabel('traffic')).toBe('Traffic');
      expect(getReportTypeLabel('medical')).toBe('Medical');
      expect(getReportTypeLabel('suspicious')).toBe('Suspicious');
      expect(getReportTypeLabel('other')).toBe('Other');
    });

    it('maps report types to default incident severity', () => {
      expect(getReportTypeSeverity('violent_crime')).toBe(3);
      expect(getReportTypeSeverity('fire')).toBe(4);
      expect(getReportTypeSeverity('traffic')).toBe(2);
      expect(getReportTypeSeverity('medical')).toBe(4);
      expect(getReportTypeSeverity('suspicious')).toBe(2);
      expect(getReportTypeSeverity('other')).toBe(2);
    });
  });

  describe('report address selection', () => {
    it('prefers the resolved place label over draft notes and fallbacks', () => {
      expect(
        buildReportAddress({
          sourceTab: 'Map',
          locationNote: 'User note',
          locationLabel: '3100 block Princeton Avenue',
          hasLocation: true,
        })
      ).toBe('3100 block Princeton Avenue');
    });

    it('uses a trimmed user location note when no place label is available', () => {
      expect(
        buildReportAddress({
          sourceTab: 'Map',
          locationNote: '  Fresh user-entered landmark  ',
          locationLabel: null,
          hasLocation: true,
        })
      ).toBe('Fresh user-entered landmark');
    });

    it('falls back by source tab before generic location labels', () => {
      expect(buildReportAddress({ sourceTab: 'Map', hasLocation: true })).toBe('Current map area');
      expect(buildReportAddress({ sourceTab: 'Incidents', hasLocation: true })).toBe('Nearby incident area');
      expect(buildReportAddress({ hasLocation: true })).toBe('Current location');
      expect(buildReportAddress({ hasLocation: false })).toBe('Unknown location');
    });
  });

  describe('report title and return copy', () => {
    it('builds a title from incident type and a trimmed location note', () => {
      expect(
        buildIncidentReportTitle({
          incidentType: 'fire',
          locationNote: '  rowhome alley side  ',
        })
      ).toBe('Fire near rowhome alley side');
    });

    it('uses generic report copy when there is no location note', () => {
      expect(buildIncidentReportTitle({ incidentType: 'medical' })).toBe('Medical report');
    });

    it('returns source-aware back labels', () => {
      expect(buildReportReviewReturnLabel('Map')).toBe('Back to map');
      expect(buildReportReviewReturnLabel('Incidents')).toBe('Back to incidents');
      expect(buildReportReviewReturnLabel()).toBe('Back to app');
    });
  });

  describe('submit eligibility', () => {
    it('allows submit only when all review requirements are satisfied', () => {
      expect(
        canSubmitReportReview({
          isSubmitting: false,
          connectedRelayCount: 1,
          hasLocation: true,
          stillActive: true,
          isWithinRadius: true,
        })
      ).toBe(true);
    });

    it('blocks submit while submitting or when required state is missing', () => {
      const validState = {
        isSubmitting: false,
        connectedRelayCount: 1,
        hasLocation: true,
        stillActive: true,
        isWithinRadius: true,
      };

      expect(canSubmitReportReview({ ...validState, isSubmitting: true })).toBe(false);
      expect(canSubmitReportReview({ ...validState, connectedRelayCount: 0 })).toBe(false);
      expect(canSubmitReportReview({ ...validState, hasLocation: false })).toBe(false);
      expect(canSubmitReportReview({ ...validState, stillActive: null })).toBe(false);
      expect(canSubmitReportReview({ ...validState, isWithinRadius: false })).toBe(false);
    });
  });
});
