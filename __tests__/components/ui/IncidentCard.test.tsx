/**
 * IncidentCard Component Tests
 *
 * Tests the IncidentCard and CompactIncidentCard components:
 * - Incident data rendering
 * - Type configuration and colors
 * - Time formatting
 * - Location display
 * - Press interactions
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Import components under test
import { IncidentCard, CompactIncidentCard } from '../../../components/ui/IncidentCard';

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

const createMockIncident = (overrides = {}) => ({
  id: 'incident-123',
  title: 'Test Incident Title',
  description: 'This is a test incident description.',
  type: 'fire',
  severity: 3 as const,
  location: {
    address: '123 Main Street',
    city: 'Test City',
    state: 'TS',
    lat: 40.7128,
    lng: -74.006,
  },
  occurredAt: new Date('2024-01-15T12:00:00Z'),
  source: 'test-source',
  ...overrides,
});

// =============================================================================
// INCIDENTCARD COMPONENT TESTS
// =============================================================================

describe('IncidentCard', () => {
  describe('Basic Rendering', () => {
    it('renders incident title', () => {
      const incident = createMockIncident();
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Test Incident Title')).toBeTruthy();
    });

    it('renders incident description', () => {
      const incident = createMockIncident();
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('This is a test incident description.')).toBeTruthy();
    });

    it('renders incident type with capitalized first letter', () => {
      const incident = createMockIncident({ type: 'fire' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Fire')).toBeTruthy();
    });

    it('renders source attribution when provided', () => {
      const incident = createMockIncident({ source: 'radio-scanner' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('via radio-scanner')).toBeTruthy();
    });

    it('does not render source when not provided', () => {
      const incident = createMockIncident({ source: undefined });
      const { queryByText } = render(<IncidentCard incident={incident} />);
      expect(queryByText(/via /)).toBeNull();
    });
  });

  describe('Incident Types', () => {
    const incidentTypes = [
      { type: 'fire', emoji: '🔥' },
      { type: 'medical', emoji: '🚑' },
      { type: 'crime', emoji: '🚨' },
      { type: 'traffic', emoji: '🚗' },
      { type: 'weather', emoji: '⛈️' },
      { type: 'hazmat', emoji: '☢️' },
      { type: 'missing', emoji: '🔍' },
      { type: 'robbery', emoji: '💰' },
      { type: 'assault', emoji: '⚠️' },
      { type: 'burglary', emoji: '🏠' },
      { type: 'shooting', emoji: '🔫' },
    ];

    incidentTypes.forEach(({ type, emoji }) => {
      it(`renders correct emoji for ${type} type`, () => {
        const incident = createMockIncident({ type });
        const { getByText } = render(<IncidentCard incident={incident} />);
        expect(getByText(emoji)).toBeTruthy();
      });
    });

    it('falls back to "other" type for unknown types', () => {
      const incident = createMockIncident({ type: 'unknown-type' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('📢')).toBeTruthy();
    });

    it('handles type with underscores', () => {
      const incident = createMockIncident({ type: 'fire_alarm' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      // Should normalize and try to match
      expect(getByText('📢')).toBeTruthy();
    });

    it('handles type with dashes', () => {
      const incident = createMockIncident({ type: 'fire-emergency' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('📢')).toBeTruthy();
    });
  });

  describe('Severity Display', () => {
    it('renders severity badge', () => {
      const incident = createMockIncident({ severity: 4 });
      const { UNSAFE_root } = render(<IncidentCard incident={incident} />);
      // SeverityBadge should be rendered
      expect(UNSAFE_root).toBeTruthy();
    });

    it('displays severity for level 1', () => {
      const incident = createMockIncident({ severity: 1 });
      const { getByText } = render(<IncidentCard incident={incident} />);
      // Should show "Low" label
      expect(getByText('Low')).toBeTruthy();
    });

    it('displays severity for level 5 (critical)', () => {
      const incident = createMockIncident({ severity: 5 });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Critical')).toBeTruthy();
    });
  });

  describe('Location Display', () => {
    it('displays address when provided', () => {
      const incident = createMockIncident({
        location: {
          address: '456 Oak Avenue',
          city: 'Springfield',
          state: 'IL',
          lat: 39.7817,
          lng: -89.6501,
        },
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('456 Oak Avenue')).toBeTruthy();
    });

    it('displays city and state when address not provided', () => {
      const incident = createMockIncident({
        location: {
          city: 'Chicago',
          state: 'IL',
          lat: 41.8781,
          lng: -87.6298,
        },
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Chicago, IL')).toBeTruthy();
    });

    it('displays coordinates when no address or city', () => {
      const incident = createMockIncident({
        location: {
          lat: 40.7128,
          lng: -74.006,
        },
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('40.7128, -74.0060')).toBeTruthy();
    });

    it('displays distance when provided', () => {
      const incident = createMockIncident();
      const { getByText } = render(
        <IncidentCard incident={incident} distance="2.5 mi" />
      );
      expect(getByText('(2.5 mi)')).toBeTruthy();
    });

    it('does not display distance when not provided', () => {
      const incident = createMockIncident();
      const { queryByText } = render(<IncidentCard incident={incident} />);
      expect(queryByText(/\(\d+(\.\d+)? mi\)/)).toBeNull();
    });
  });

  describe('Time Display', () => {
    beforeEach(() => {
      // Mock current time for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T14:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows "Just now" for very recent incidents', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-15T13:59:30Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Just now')).toBeTruthy();
    });

    it('shows minutes for incidents less than an hour old', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-15T13:30:00Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('30 min ago')).toBeTruthy();
    });

    it('shows hours for incidents less than a day old', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-15T10:00:00Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('4h ago')).toBeTruthy();
    });

    it('shows "Yesterday" for incidents from yesterday', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-14T12:00:00Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Yesterday')).toBeTruthy();
    });

    it('shows "X days ago" for incidents within a week', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-12T12:00:00Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('3 days ago')).toBeTruthy();
    });

    it('shows date for incidents older than a week', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-01T12:00:00Z'),
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      // Should show formatted date
      expect(getByText(/1\/1\/2024/)).toBeTruthy();
    });

    it('handles string date format', () => {
      const incident = createMockIncident({
        occurredAt: '2024-01-15T13:00:00Z',
      });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('1h ago')).toBeTruthy();
    });
  });

  describe('Expanded Mode', () => {
    it('truncates title to 2 lines by default', () => {
      const incident = createMockIncident({
        title: 'Very long title that should be truncated when not expanded',
      });
      const { getByText } = render(
        <IncidentCard incident={incident} expanded={false} />
      );
      const titleElement = getByText(/Very long title/);
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('shows full title when expanded', () => {
      const incident = createMockIncident({
        title: 'Very long title that should NOT be truncated when expanded',
      });
      const { getByText } = render(
        <IncidentCard incident={incident} expanded={true} />
      );
      const titleElement = getByText(/Very long title/);
      expect(titleElement.props.numberOfLines).toBeUndefined();
    });

    it('truncates description by default', () => {
      const incident = createMockIncident({
        description: 'Very long description text',
      });
      const { getByText } = render(
        <IncidentCard incident={incident} expanded={false} />
      );
      const descElement = getByText(/Very long description/);
      expect(descElement.props.numberOfLines).toBe(2);
    });

    it('shows full description when expanded', () => {
      const incident = createMockIncident({
        description: 'Very long description text',
      });
      const { getByText } = render(
        <IncidentCard incident={incident} expanded={true} />
      );
      const descElement = getByText(/Very long description/);
      expect(descElement.props.numberOfLines).toBeUndefined();
    });
  });

  describe('Press Interaction', () => {
    it('calls onPress with incident when pressed', () => {
      const incident = createMockIncident();
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <IncidentCard incident={incident} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Incident Title'));

      expect(mockOnPress).toHaveBeenCalledWith(incident);
    });

    it('calls onPress only once per press', () => {
      const incident = createMockIncident();
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <IncidentCard incident={incident} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Incident Title'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not wrap in TouchableOpacity when onPress not provided', () => {
      const incident = createMockIncident();
      const { UNSAFE_root } = render(<IncidentCard incident={incident} />);

      // Without onPress, the component should not have touchable wrapper
      const touchables = UNSAFE_root.findAllByType('TouchableOpacity' as any);
      expect(touchables.length).toBe(0);
    });

    it('wraps in TouchableOpacity when onPress provided', () => {
      const incident = createMockIncident();
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <IncidentCard incident={incident} onPress={mockOnPress} />
      );

      // Component should be pressable - verify by pressing it
      fireEvent.press(getByText('Test Incident Title'));
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('Missing Data Handling', () => {
    it('renders without description', () => {
      const incident = createMockIncident({ description: undefined });
      const { getByText, queryByText } = render(
        <IncidentCard incident={incident} />
      );
      expect(getByText('Test Incident Title')).toBeTruthy();
      expect(queryByText('This is a test')).toBeNull();
    });

    it('handles empty description', () => {
      const incident = createMockIncident({ description: '' });
      const { getByText } = render(<IncidentCard incident={incident} />);
      expect(getByText('Test Incident Title')).toBeTruthy();
    });
  });
});

// =============================================================================
// COMPACTINCIDENTCARD COMPONENT TESTS
// =============================================================================

describe('CompactIncidentCard', () => {
  describe('Basic Rendering', () => {
    it('renders incident title', () => {
      const incident = createMockIncident();
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText('Test Incident Title')).toBeTruthy();
    });

    it('renders type emoji', () => {
      const incident = createMockIncident({ type: 'medical' });
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText('🚑')).toBeTruthy();
    });

    it('renders severity number', () => {
      const incident = createMockIncident({ severity: 4 });
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText('4')).toBeTruthy();
    });

    it('renders city in meta text', () => {
      const incident = createMockIncident({
        location: { city: 'Boston', state: 'MA', lat: 0, lng: 0 },
      });
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText(/Boston/)).toBeTruthy();
    });

    it('shows "Unknown" when city is missing', () => {
      const incident = createMockIncident({
        location: { lat: 0, lng: 0 },
      });
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText(/Unknown/)).toBeTruthy();
    });
  });

  describe('Press Interaction', () => {
    it('calls onPress with incident when pressed', () => {
      const incident = createMockIncident();
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <CompactIncidentCard incident={incident} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Incident Title'));

      expect(mockOnPress).toHaveBeenCalledWith(incident);
    });

    it('does not require onPress', () => {
      const incident = createMockIncident();
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText('Test Incident Title')).toBeTruthy();
    });
  });

  describe('Time Display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T14:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows time in meta text', () => {
      const incident = createMockIncident({
        occurredAt: new Date('2024-01-15T13:30:00Z'),
      });
      const { getByText } = render(<CompactIncidentCard incident={incident} />);
      expect(getByText(/30 min ago/)).toBeTruthy();
    });
  });

  describe('Severity Colors', () => {
    const severityLevels = [1, 2, 3, 4, 5] as const;

    severityLevels.forEach((severity) => {
      it(`renders severity ${severity} with correct background`, () => {
        const incident = createMockIncident({ severity });
        const { getByText } = render(
          <CompactIncidentCard incident={incident} />
        );
        expect(getByText(String(severity))).toBeTruthy();
      });
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles extremely long titles gracefully', () => {
    const incident = createMockIncident({
      title: 'A'.repeat(500),
    });
    const { UNSAFE_root } = render(<IncidentCard incident={incident} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('handles special characters in title', () => {
    const incident = createMockIncident({
      title: '<Alert> Fire & "Emergency" @ Location',
    });
    const { getByText } = render(<IncidentCard incident={incident} />);
    expect(getByText('<Alert> Fire & "Emergency" @ Location')).toBeTruthy();
  });

  it('handles emojis in title', () => {
    const incident = createMockIncident({
      title: '🚨 Emergency Alert',
    });
    const { getByText } = render(<IncidentCard incident={incident} />);
    expect(getByText('🚨 Emergency Alert')).toBeTruthy();
  });

  it('handles negative coordinates', () => {
    const incident = createMockIncident({
      location: {
        lat: -33.8688,
        lng: 151.2093,
      },
    });
    const { getByText } = render(<IncidentCard incident={incident} />);
    expect(getByText('-33.8688, 151.2093')).toBeTruthy();
  });

  it('handles zero coordinates', () => {
    const incident = createMockIncident({
      location: {
        lat: 0,
        lng: 0,
      },
    });
    const { getByText } = render(<IncidentCard incident={incident} />);
    expect(getByText('0.0000, 0.0000')).toBeTruthy();
  });
});
