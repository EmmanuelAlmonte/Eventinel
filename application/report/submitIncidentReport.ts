import type NDK from '@nostr-dev-kit/mobile';

import {
  buildIncidentReportTitle,
  getReportTypeSeverity,
  type ReportIncidentType,
  type ReportSourceTab,
} from '../../domain/report';
import { createIncidentEvent } from '../../lib/nostr/events/incident';

export type SubmitIncidentReportInput = {
  ndk: NDK;
  incidentType: ReportIncidentType;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  reportAddress: string;
  sourceTab?: ReportSourceTab;
  locationNote?: string;
  stillActive: boolean;
  occurredAt?: Date;
  sourceId?: string;
};

export async function submitIncidentReport({
  ndk,
  incidentType,
  description,
  location,
  reportAddress,
  sourceTab,
  locationNote,
  stillActive,
  occurredAt = new Date(),
  sourceId = `community-${Date.now()}`,
}: SubmitIncidentReportInput) {
  const event = createIncidentEvent(ndk, {
    type: incidentType,
    severity: getReportTypeSeverity(incidentType),
    title: buildIncidentReportTitle({ incidentType, locationNote }),
    description,
    location: {
      lat: location.latitude,
      lng: location.longitude,
      address: reportAddress,
    },
    occurredAt,
    source: 'community',
    sourceId,
    metadata: {
      sourceTab,
      entrypoint: 'report-incident-flow',
      locationNote: locationNote || undefined,
      stillActive,
      reportStatus: stillActive ? 'active' : 'not_active',
    },
  });

  await event.publish();
}
