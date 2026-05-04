import type { ReportDraft } from '../../../contexts/ReportDraftContext';
import { buildReportLocation } from './buildReportLocation';

export function buildReportDraft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    sourceTab: 'Map',
    location: buildReportLocation(),
    incidentType: 'fire',
    description: 'LOCAL RELAY QA 1776709409 smoke from rowhome on alley side',
    locationNote: 'LOCAL RELAY QA 1776709409',
    stillActive: true,
    mediaAttachments: [],
    ...overrides,
  };
}
