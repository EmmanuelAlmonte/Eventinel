import { StyleSheet } from 'react-native';

export const incidentFeedStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  relayBanner: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  relayBannerContent: {
    flex: 1,
  },
  relayBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relayBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  relayBannerDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  relayBannerActionContainer: {
    alignSelf: 'center',
    marginTop: 0,
    marginRight: -8,
  },
  relayBannerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  incidentRowPressed: {
    opacity: 0.78,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  supportPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supportPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 4,
  },
  severityBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  incidentDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    fontSize: 11,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
