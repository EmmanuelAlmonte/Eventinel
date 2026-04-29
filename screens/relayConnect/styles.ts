import { StyleSheet } from 'react-native';

export const relayConnectStyles = StyleSheet.create({
  header: {
    marginTop: 8,
    marginBottom: 18,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  summarySection: {
    marginBottom: 22,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    margin: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryHeadline: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  summarySubtext: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  healthChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 19,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    marginBottom: 10,
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
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
  },
  relayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  relayRowDivider: {
    borderTopWidth: 1,
  },
  relayContent: {
    flex: 1,
    minWidth: 0,
  },
  relayUrl: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  relayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryMetaText: {
    fontSize: 12,
    lineHeight: 18,
  },
  relayKindText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  relayActions: {
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 2,
  },
  tertiaryAction: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineTextAction: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  inlineTextActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionDisabled: {
    opacity: 0.42,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    marginHorizontal: 18,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
  },
  devSection: {
    marginBottom: 24,
  },
  devCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    margin: 0,
    opacity: 0.94,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  devText: {
    flex: 1,
  },
  devTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  devDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
