import { Platform, StyleSheet } from 'react-native';

export const loginScreenStyles = StyleSheet.create({
  header: {
    marginBottom: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '92%',
    textAlign: 'center',
  },
  loadingOverlay: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    margin: 0,
    marginBottom: 16,
  },
  authCard: {
    paddingTop: 14,
  },
  segmentedControl: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  authBody: {
    marginTop: 20,
  },
  authBodyHeader: {
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  authSublabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  authDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonContainer: {
    marginTop: 6,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSolid: {
    borderWidth: 1,
  },
  actionButtonGhost: {
    borderWidth: 0,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  actionButtonDisabled: {
    opacity: 0.58,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonTextSolid: {
    fontWeight: '700',
  },
  actionButtonTextGhost: {
    fontWeight: '600',
  },
  inlineNotice: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  inlineNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  installedSignerActions: {
    gap: 8,
  },
  advancedSection: {
    marginTop: 12,
  },
  advancedToggle: {
    minHeight: 36,
    paddingHorizontal: 4,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedPanel: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  warningPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  warningBody: {
    flex: 1,
  },
  warningPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningPanelText: {
    fontSize: 13,
    lineHeight: 19,
  },
  helpDivider: {
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 18,
  },
  privateKeyActions: {
    gap: 8,
  },
  privateKeySecondaryAction: {
    marginTop: 0,
  },
  privateKeyPrimaryAction: {
    marginTop: 0,
  },
  keyOverlay: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '90%',
    maxWidth: 420,
  },
  keyContent: {
    gap: 12,
  },
  generatedKeyText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  generatedPubkeyText: {
    fontSize: 12,
  },
  helpNote: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  helpNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpNoteText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
