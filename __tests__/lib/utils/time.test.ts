/**
 * Unit Tests for lib/utils/time.ts
 *
 * Tests formatRelativeTime, formatRelativeTimeMs, and formatAge functions.
 * These are pure functions with no external dependencies.
 */

import {
  formatRelativeTime,
  formatRelativeTimeMs,
  formatAge,
} from '../../../lib/utils/time';

// =============================================================================
// formatRelativeTime Tests
// =============================================================================

describe('formatRelativeTime', () => {
  // Store original Date.now for cleanup
  const originalDateNow = Date.now;

  afterEach(() => {
    // Restore original Date.now after each test
    jest.restoreAllMocks();
  });

  describe('returns "just now" for recent timestamps', () => {
    it('returns "just now" for current time', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('returns "just now" for 30 seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000);
      expect(formatRelativeTime(date)).toBe('just now');
    });

    it('returns "just now" for 59 seconds ago', () => {
      const date = new Date(Date.now() - 59 * 1000);
      expect(formatRelativeTime(date)).toBe('just now');
    });
  });

  describe('handles future timestamps (clock skew)', () => {
    it('returns "just now" for timestamp 1 second in the future', () => {
      const futureDate = new Date(Date.now() + 1000);
      expect(formatRelativeTime(futureDate)).toBe('just now');
    });

    it('returns "just now" for timestamp 1 hour in the future', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      expect(formatRelativeTime(futureDate)).toBe('just now');
    });

    it('returns "just now" for timestamp 1 day in the future', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(futureDate)).toBe('just now');
    });
  });

  describe('formats minutes correctly', () => {
    it('returns "1m ago" for 1 minute ago', () => {
      const date = new Date(Date.now() - 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1m ago');
    });

    it('returns "5m ago" for 5 minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('5m ago');
    });

    it('returns "30m ago" for 30 minutes ago', () => {
      const date = new Date(Date.now() - 30 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('30m ago');
    });

    it('returns "59m ago" for 59 minutes ago', () => {
      const date = new Date(Date.now() - 59 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('59m ago');
    });
  });

  describe('formats hours correctly', () => {
    it('returns "1h ago" for 1 hour ago', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1h ago');
    });

    it('returns "2h ago" for 2 hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2h ago');
    });

    it('returns "12h ago" for 12 hours ago', () => {
      const date = new Date(Date.now() - 12 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('12h ago');
    });

    it('returns "23h ago" for 23 hours ago', () => {
      const date = new Date(Date.now() - 23 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('23h ago');
    });
  });

  describe('formats days correctly', () => {
    it('returns "1d ago" for 24 hours ago', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1d ago');
    });

    it('returns "2d ago" for 48 hours ago', () => {
      const date = new Date(Date.now() - 48 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2d ago');
    });

    it('returns "6d ago" for 6 days ago', () => {
      const date = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('6d ago');
    });
  });

  describe('formats old dates as localized date strings', () => {
    it('returns date string for 7 days ago', () => {
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);
      // Should be a date string, not "Xd ago"
      expect(result).not.toContain('d ago');
      expect(result).not.toContain('h ago');
      expect(result).not.toContain('m ago');
    });

    it('returns date string for 30 days ago', () => {
      const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);
      expect(result).not.toContain('d ago');
    });

    it('returns date string for 1 year ago', () => {
      const date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);
      expect(result).not.toContain('d ago');
    });
  });

  describe('boundary values', () => {
    it('handles exactly 60 seconds (1 minute boundary)', () => {
      const date = new Date(Date.now() - 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1m ago');
    });

    it('handles exactly 60 minutes (1 hour boundary)', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1h ago');
    });

    it('handles exactly 24 hours (1 day boundary)', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('1d ago');
    });

    it('handles exactly 7 days (week boundary)', () => {
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);
      // At 7 days, should transition to date string
      expect(result).not.toContain('d ago');
    });
  });
});

// =============================================================================
// formatRelativeTimeMs Tests
// =============================================================================

describe('formatRelativeTimeMs', () => {
  it('correctly converts milliseconds timestamp to relative time', () => {
    const ms = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    expect(formatRelativeTimeMs(ms)).toBe('5m ago');
  });

  it('handles current timestamp', () => {
    expect(formatRelativeTimeMs(Date.now())).toBe('just now');
  });

  it('handles future timestamp', () => {
    const futureMs = Date.now() + 60 * 1000;
    expect(formatRelativeTimeMs(futureMs)).toBe('just now');
  });

  it('handles timestamp from 2 hours ago', () => {
    const ms = Date.now() - 2 * 60 * 60 * 1000;
    expect(formatRelativeTimeMs(ms)).toBe('2h ago');
  });

  it('handles timestamp from 3 days ago', () => {
    const ms = Date.now() - 3 * 24 * 60 * 60 * 1000;
    expect(formatRelativeTimeMs(ms)).toBe('3d ago');
  });

  it('handles zero timestamp (Unix epoch)', () => {
    const result = formatRelativeTimeMs(0);
    // Very old date should return date string
    expect(result).not.toContain('ago');
  });
});

// =============================================================================
// formatAge Tests
// =============================================================================

describe('formatAge', () => {
  describe('returns "just now" for recent times', () => {
    it('returns "just now" for 0 seconds', () => {
      expect(formatAge(0)).toBe('just now');
    });

    it('returns "just now" for 30 seconds', () => {
      expect(formatAge(30)).toBe('just now');
    });

    it('returns "just now" for 59 seconds', () => {
      expect(formatAge(59)).toBe('just now');
    });
  });

  describe('handles negative values (future/invalid)', () => {
    it('returns "just now" for -1 second', () => {
      expect(formatAge(-1)).toBe('just now');
    });

    it('returns "just now" for -1000 seconds', () => {
      expect(formatAge(-1000)).toBe('just now');
    });
  });

  describe('formats minutes correctly', () => {
    it('returns "1m ago" for 60 seconds', () => {
      expect(formatAge(60)).toBe('1m ago');
    });

    it('returns "5m ago" for 300 seconds', () => {
      expect(formatAge(300)).toBe('5m ago');
    });

    it('returns "30m ago" for 1800 seconds', () => {
      expect(formatAge(1800)).toBe('30m ago');
    });

    it('returns "59m ago" for 3540 seconds', () => {
      expect(formatAge(3540)).toBe('59m ago');
    });
  });

  describe('formats hours correctly', () => {
    it('returns "1h ago" for 3600 seconds (1 hour)', () => {
      expect(formatAge(3600)).toBe('1h ago');
    });

    it('returns "2h ago" for 7200 seconds (2 hours)', () => {
      expect(formatAge(7200)).toBe('2h ago');
    });

    it('returns "12h ago" for 43200 seconds (12 hours)', () => {
      expect(formatAge(43200)).toBe('12h ago');
    });

    it('returns "23h ago" for 82800 seconds (23 hours)', () => {
      expect(formatAge(82800)).toBe('23h ago');
    });
  });

  describe('formats days correctly', () => {
    it('returns "1d ago" for 86400 seconds (1 day)', () => {
      expect(formatAge(86400)).toBe('1d ago');
    });

    it('returns "2d ago" for 172800 seconds (2 days)', () => {
      expect(formatAge(172800)).toBe('2d ago');
    });

    it('returns "7d ago" for 604800 seconds (7 days)', () => {
      expect(formatAge(604800)).toBe('7d ago');
    });

    it('returns "30d ago" for 2592000 seconds (30 days)', () => {
      expect(formatAge(2592000)).toBe('30d ago');
    });

    it('returns "365d ago" for one year in seconds', () => {
      expect(formatAge(31536000)).toBe('365d ago');
    });
  });

  describe('boundary values', () => {
    it('handles 60 seconds boundary (minute transition)', () => {
      expect(formatAge(59)).toBe('just now');
      expect(formatAge(60)).toBe('1m ago');
    });

    it('handles 3600 seconds boundary (hour transition)', () => {
      expect(formatAge(3599)).toBe('59m ago');
      expect(formatAge(3600)).toBe('1h ago');
    });

    it('handles 86400 seconds boundary (day transition)', () => {
      expect(formatAge(86399)).toBe('23h ago');
      expect(formatAge(86400)).toBe('1d ago');
    });
  });

  describe('edge cases', () => {
    it('handles very large values', () => {
      // 10 years in seconds
      const tenYears = 10 * 365 * 24 * 60 * 60;
      expect(formatAge(tenYears)).toBe('3650d ago');
    });

    it('handles floating point values by truncating', () => {
      expect(formatAge(90.5)).toBe('1m ago'); // 90.5 seconds = 1 minute
    });

    it('handles NaN (returns NaNd ago - implementation detail)', () => {
      // Math.floor(NaN / X) = NaN, which passes through the if conditions
      // In practice, NaN would not be a valid input, but this documents current behavior
      const result = formatAge(NaN);
      // NaN comparisons are all false, so it falls through to the days case
      expect(result).toBe('NaNd ago');
    });
  });
});
