export type IncidentReplacementMetadata = {
  createdAt: number;
  eventId: string;
};

export function shouldReplaceIncidentByMetadata(
  existing: IncidentReplacementMetadata | undefined,
  incoming: IncidentReplacementMetadata
): boolean {
  if (!existing) {
    return true;
  }

  if (incoming.createdAt > existing.createdAt) {
    return true;
  }

  if (incoming.createdAt === existing.createdAt) {
    return incoming.eventId.localeCompare(existing.eventId) > 0;
  }

  return false;
}
