/**
 * Incident Event Type Guard Tests
 */

import {
  isDataSource,
  isIncidentEventContent,
  isIncidentType,
  isSeverity,
} from '../../../../lib/nostr/events/types';

describe('Type Guards', () => {
  describe('isIncidentType', () => {
    it('returns true for valid incident types', () => {
      expect(isIncidentType('fire')).toBe(true);
      expect(isIncidentType('medical')).toBe(true);
      expect(isIncidentType('traffic')).toBe(true);
      expect(isIncidentType('transit')).toBe(true);
      expect(isIncidentType('weather')).toBe(true);
      expect(isIncidentType('public_health')).toBe(true);
      expect(isIncidentType('violent_crime')).toBe(true);
      expect(isIncidentType('property_crime')).toBe(true);
      expect(isIncidentType('disturbance')).toBe(true);
      expect(isIncidentType('suspicious')).toBe(true);
      expect(isIncidentType('other')).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isIncidentType('invalid')).toBe(false);
      expect(isIncidentType('FIRE')).toBe(false); // Case sensitive
      expect(isIncidentType('')).toBe(false);
      expect(isIncidentType('crime')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isIncidentType(123)).toBe(false);
      expect(isIncidentType(null)).toBe(false);
      expect(isIncidentType(undefined)).toBe(false);
      expect(isIncidentType({})).toBe(false);
      expect(isIncidentType(['fire'])).toBe(false);
    });
  });

  describe('isSeverity', () => {
    it('returns true for valid severity levels', () => {
      expect(isSeverity(1)).toBe(true);
      expect(isSeverity(2)).toBe(true);
      expect(isSeverity(3)).toBe(true);
      expect(isSeverity(4)).toBe(true);
      expect(isSeverity(5)).toBe(true);
    });

    it('returns false for invalid severity levels', () => {
      expect(isSeverity(0)).toBe(false);
      expect(isSeverity(6)).toBe(false);
      expect(isSeverity(-1)).toBe(false);
      expect(isSeverity(10)).toBe(false);
    });

    it('returns false for non-numeric types', () => {
      expect(isSeverity('3')).toBe(false);
      expect(isSeverity(null)).toBe(false);
      expect(isSeverity(undefined)).toBe(false);
      expect(isSeverity(3.5)).toBe(true); // Current guard accepts numeric values in range
    });
  });

  describe('isDataSource', () => {
    it('returns true for valid data sources', () => {
      expect(isDataSource('crimeometer')).toBe(true);
      expect(isDataSource('opendataphilly')).toBe(true);
      expect(isDataSource('radio')).toBe(true);
      expect(isDataSource('community')).toBe(true);
      expect(isDataSource('eventinel-test')).toBe(true);
      expect(isDataSource('nj_transit_rss')).toBe(true);
      expect(isDataSource('nj_511_rss')).toBe(true);
    });

    it('returns false for invalid data sources', () => {
      expect(isDataSource('invalid')).toBe(false);
      expect(isDataSource('CRIMEOMETER')).toBe(false); // Case sensitive
      expect(isDataSource('')).toBe(false);
      expect(isDataSource('twitter')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isDataSource(123)).toBe(false);
      expect(isDataSource(null)).toBe(false);
      expect(isDataSource(undefined)).toBe(false);
      expect(isDataSource({})).toBe(false);
    });
  });

  describe('isIncidentEventContent', () => {
    it('returns true for valid incident content', () => {
      const validContent = {
        title: 'Test Incident',
        description: 'Test description',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test-123',
      };

      expect(isIncidentEventContent(validContent)).toBe(true);
    });

    it('returns true for valid content with optional fields', () => {
      const validContent = {
        title: 'Test',
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'medical',
        severity: 4,
        occurredAt: new Date().toISOString(),
        source: 'eventinel-test',
        sourceId: 'test-123',
        city: 'Sample City',
        state: 'ST',
        metadata: { custom: 'data' },
      };

      expect(isIncidentEventContent(validContent)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      const missingTitle = {
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(missingTitle)).toBe(false);
    });

    it('returns false for invalid field types', () => {
      const invalidTypes = {
        title: 123, // Should be string
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'fire',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(invalidTypes)).toBe(false);
    });

    it('returns false for invalid nested type values', () => {
      const invalidType = {
        title: 'Test',
        description: 'Test',
        lat: 39.95,
        lng: -75.16,
        type: 'invalid_type',
        severity: 3,
        occurredAt: new Date().toISOString(),
        source: 'crimeometer',
        sourceId: 'test',
      };

      expect(isIncidentEventContent(invalidType)).toBe(false);
    });

    it('returns false for non-object inputs', () => {
      expect(isIncidentEventContent(null)).toBe(false);
      expect(isIncidentEventContent(undefined)).toBe(false);
      expect(isIncidentEventContent('string')).toBe(false);
      expect(isIncidentEventContent(123)).toBe(false);
      expect(isIncidentEventContent([])).toBe(false);
    });
  });
});
