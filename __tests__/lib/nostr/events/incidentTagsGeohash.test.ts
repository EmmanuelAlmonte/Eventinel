/**
 * Incident Tag and Geohash Helper Tests
 */

import { getTagValue, getTagValues } from '../../../../lib/nostr/events/incident';

describe('Tag Helpers', () => {
  describe('getTagValue', () => {
    it('extracts single tag value', () => {
      const tags = [
        ['d', 'incident-123'],
        ['type', 'fire'],
        ['severity', '4'],
      ];

      expect(getTagValue(tags, 'd')).toBe('incident-123');
      expect(getTagValue(tags, 'type')).toBe('fire');
      expect(getTagValue(tags, 'severity')).toBe('4');
    });

    it('returns undefined for non-existent tag', () => {
      const tags = [['type', 'fire']];
      expect(getTagValue(tags, 'missing')).toBeUndefined();
    });

    it('returns first value when multiple tags exist', () => {
      const tags = [
        ['t', 'eventinel'],
        ['t', 'incident'],
        ['t', 'fire'],
      ];

      expect(getTagValue(tags, 't')).toBe('eventinel');
    });

    it('handles empty tags array', () => {
      expect(getTagValue([], 'any')).toBeUndefined();
    });
  });

  describe('getTagValues', () => {
    it('extracts all values for a tag type', () => {
      const tags = [
        ['t', 'eventinel'],
        ['t', 'incident'],
        ['t', 'fire'],
        ['type', 'fire'],
      ];

      const hashtags = getTagValues(tags, 't');
      expect(hashtags).toEqual(['eventinel', 'incident', 'fire']);
    });

    it('returns empty array for non-existent tag', () => {
      const tags = [['type', 'fire']];
      expect(getTagValues(tags, 'missing')).toEqual([]);
    });

    it('handles empty tags array', () => {
      expect(getTagValues([], 'any')).toEqual([]);
    });

    it('returns single value in array', () => {
      const tags = [['d', 'incident-123']];
      expect(getTagValues(tags, 'd')).toEqual(['incident-123']);
    });
  });
});
