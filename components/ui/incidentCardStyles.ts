import { StyleSheet } from 'react-native';

import { NEUTRAL, PRIMARY } from '@lib/brand/colors';

export const incidentCardStyles = StyleSheet.create({
  card: {
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    padding: 14,
    margin: 0,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeEmoji: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  typeText: {
    color: NEUTRAL.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: NEUTRAL.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    color: NEUTRAL.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  distanceText: {
    color: PRIMARY.DEFAULT,
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
  },
  sourceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: NEUTRAL.darkBorder,
  },
  sourceText: {
    color: NEUTRAL.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEUTRAL.darkElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: NEUTRAL.darkBorder,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  compactEmoji: {
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    color: NEUTRAL.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  compactMeta: {
    color: NEUTRAL.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  compactSeverity: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSeverityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
