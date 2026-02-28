import { Platform, StyleSheet } from 'react-native';

export const profileScreenStyles = StyleSheet.create({
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    margin: 0,
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
  },
  avatarTitle: {
    fontSize: 36,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
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
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pubkeyText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pubkeyHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  fullPubkey: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
});
