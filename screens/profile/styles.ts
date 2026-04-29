import { Platform, StyleSheet } from 'react-native';

export const profileScreenStyles = StyleSheet.create({
  header: {
    marginTop: 8,
    marginBottom: 22,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    margin: 0,
    marginBottom: 22,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    marginBottom: 0,
  },
  avatarTitle: {
    fontSize: 34,
    fontWeight: '700',
  },
  heroIdentity: {
    flex: 1,
    paddingTop: 2,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  nip05Container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  nip05Text: {
    fontSize: 14,
    fontWeight: '500',
  },
  about: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroActionButton: {
    flex: 1,
  },
  heroAction: {
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroActionPrimary: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  heroActionSecondary: {
    borderWidth: 1,
  },
  heroActionPrimaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  heroActionSecondaryPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  heroActionPrimaryDisabled: {
    opacity: 0.45,
  },
  heroActionSecondaryDisabled: {
    opacity: 0.55,
  },
  heroActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroActionSecondaryText: {
    fontWeight: '700',
  },
  heroActionPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderTopWidth: 1,
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 19,
  },
  rowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rowPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advancedBody: {
    borderTopWidth: 1,
    padding: 16,
  },
  advancedActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  advancedActionButton: {
    flex: 1,
  },
  advancedToken: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 10,
    lineHeight: 16,
  },
  advancedHint: {
    fontSize: 12,
    marginTop: 8,
  },
  advancedEmpty: {
    fontSize: 12,
    lineHeight: 16,
  },
  pushTokenText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 8,
    lineHeight: 16,
  },
  pushTokenHint: {
    fontSize: 12,
    marginTop: 8,
  },
  pushTokenEmpty: {
    fontSize: 12,
    lineHeight: 16,
  },
  pushStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pushStatusLabel: {
    fontSize: 13,
  },
  pushStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pushStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pushStatusValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  pushActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pushActionButton: {
    flex: 1,
  },
  historyWindowButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  historyWindowButtonContainer: {
    minWidth: 92,
  },
  historyWindowButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  historyWindowButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
