/**
 * IncidentHeader Component Tests
 *
 * Tests the incident header component including:
 * - Rendering for all incident types
 * - Correct type configuration (icon, label, colors)
 * - Severity display and coloring
 * - Time formatting (relative time)
 * - Verified badge display
 * - Title rendering
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { IncidentHeader } from '../../../components/incident/IncidentHeader';
import { TYPE_CONFIG, SEVERITY_COLORS, INCIDENT_TYPES } from '@lib/nostr/config';
import type { IncidentType, Severity } from '@lib/nostr/config';

// =============================================================================
// MOCKS
// =============================================================================

// Mock the useAppTheme hook
jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      success: '#22C55E',
    },
    isDark: true,
  }),
}));

// Mock the time utility
jest.mock('@lib/utils/time', () => ({
  formatRelativeTimeMs: jest.fn((ms: number) => {
    const now = Date.now();
    const diffMs = now - ms;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString();
  }),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const allIncidentTypes: IncidentType[] = [
  'fire',
  'medical',
  'traffic',
  'transit',
  'weather',
  'public_health',
  'violent_crime',
  'property_crime',
  'disturbance',
  'suspicious',
  'other',
];

const allSeverityLevels: Severity[] = [1, 2, 3, 4, 5];

const createDefaultProps = (overrides = {}) => ({
  type: 'fire' as IncidentType,
  title: 'Test Incident Title',
  severity: 3 as Severity,
  occurredAtMs: Date.now() - 3600000, // 1 hour ago
  verified: true,
  ...overrides,
});

// =============================================================================
// STYLE HELPERS
// =============================================================================

// Helper to get style property value (handles both flat and array styles)
const getStyleProp = (style: any, prop: string): any => {
  if (Array.isArray(style)) {
    const reversed = [...style].reverse();
    const found = reversed.find((s: any) => s?.[prop] !== undefined);
    return found?.[prop];
  }
  return style?.[prop];
};

// =============================================================================
// TEST SETUP
// =============================================================================

describe('IncidentHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const props = createDefaultProps();
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Test Incident Title')).toBeTruthy();
    });

    it('renders the title', () => {
      const props = createDefaultProps({ title: 'Fire at Main Street' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Fire at Main Street')).toBeTruthy();
    });

    it('renders a container View', () => {
      const props = createDefaultProps();
      const { toJSON } = render(<IncidentHeader {...props} />);
      const tree = toJSON();
      expect(tree).not.toBeNull();
      expect(tree?.type).toBe('View');
    });

    it('displays severity level text', () => {
      const props = createDefaultProps({ severity: 4 });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Severity 4')).toBeTruthy();
    });
  });

  // =============================================================================
  // INCIDENT TYPE TESTS
  // =============================================================================

  describe('Incident Types', () => {
    it.each(allIncidentTypes)('renders %s incident type correctly', (type) => {
      const props = createDefaultProps({ type });
      const config = TYPE_CONFIG[type];
      const { getByText } = render(<IncidentHeader {...props} />);

      // Should display the type label in uppercase
      expect(getByText(config.label.toUpperCase())).toBeTruthy();
    });

    it('displays FIRE label for fire type', () => {
      const props = createDefaultProps({ type: 'fire' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('FIRE')).toBeTruthy();
    });

    it('displays MEDICAL label for medical type', () => {
      const props = createDefaultProps({ type: 'medical' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('MEDICAL')).toBeTruthy();
    });

    it('displays TRAFFIC label for traffic type', () => {
      const props = createDefaultProps({ type: 'traffic' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('TRAFFIC')).toBeTruthy();
    });

    it('displays TRANSIT label for transit type', () => {
      const props = createDefaultProps({ type: 'transit' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('TRANSIT')).toBeTruthy();
    });

    it('displays WEATHER label for weather type', () => {
      const props = createDefaultProps({ type: 'weather' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('WEATHER')).toBeTruthy();
    });

    it('displays PUBLIC HEALTH label for public_health type', () => {
      const props = createDefaultProps({ type: 'public_health' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('PUBLIC HEALTH')).toBeTruthy();
    });

    it('displays CRIME label for violent_crime type', () => {
      const props = createDefaultProps({ type: 'violent_crime' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('CRIME')).toBeTruthy();
    });

    it('displays PROPERTY CRIME label for property_crime type', () => {
      const props = createDefaultProps({ type: 'property_crime' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('PROPERTY CRIME')).toBeTruthy();
    });

    it('displays DISTURBANCE label for disturbance type', () => {
      const props = createDefaultProps({ type: 'disturbance' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('DISTURBANCE')).toBeTruthy();
    });

    it('displays SUSPICIOUS label for suspicious type', () => {
      const props = createDefaultProps({ type: 'suspicious' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('SUSPICIOUS')).toBeTruthy();
    });

    it('displays OTHER label for other type', () => {
      const props = createDefaultProps({ type: 'other' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('OTHER')).toBeTruthy();
    });

    it('falls back to "other" config for unknown type', () => {
      const props = createDefaultProps({ type: 'unknown_type' as IncidentType });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('OTHER')).toBeTruthy();
    });
  });

  // =============================================================================
  // TYPE CONFIG COLOR TESTS
  // =============================================================================

  describe('Type Configuration Colors', () => {
    it('applies fire type color to label', () => {
      const props = createDefaultProps({ type: 'fire' });
      const { getByText } = render(<IncidentHeader {...props} />);
      const label = getByText('FIRE');
      const color = getStyleProp(label.props.style, 'color');
      expect(color).toBe(TYPE_CONFIG.fire.color);
    });

    it('applies medical type color to label', () => {
      const props = createDefaultProps({ type: 'medical' });
      const { getByText } = render(<IncidentHeader {...props} />);
      const label = getByText('MEDICAL');
      const color = getStyleProp(label.props.style, 'color');
      expect(color).toBe(TYPE_CONFIG.medical.color);
    });

    it('applies traffic type color to label', () => {
      const props = createDefaultProps({ type: 'traffic' });
      const { getByText } = render(<IncidentHeader {...props} />);
      const label = getByText('TRAFFIC');
      const color = getStyleProp(label.props.style, 'color');
      expect(color).toBe(TYPE_CONFIG.traffic.color);
    });

    it.each(allIncidentTypes)('%s type uses correct color from TYPE_CONFIG', (type) => {
      const props = createDefaultProps({ type });
      const config = TYPE_CONFIG[type];
      const { getByText } = render(<IncidentHeader {...props} />);
      const label = getByText(config.label.toUpperCase());
      const color = getStyleProp(label.props.style, 'color');
      expect(color).toBe(config.color);
    });
  });

  // =============================================================================
  // SEVERITY TESTS
  // =============================================================================

  describe('Severity Display', () => {
    it.each(allSeverityLevels)('displays severity %i correctly', (severity) => {
      const props = createDefaultProps({ severity });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText(`Severity ${severity}`)).toBeTruthy();
    });

    it('displays severity text with correct color for severity 1', () => {
      const props = createDefaultProps({ severity: 1 });
      const { getByText } = render(<IncidentHeader {...props} />);
      const severityText = getByText('Severity 1');
      const color = getStyleProp(severityText.props.style, 'color');
      expect(color).toBe(SEVERITY_COLORS[1]);
    });

    it('displays severity text with correct color for severity 5', () => {
      const props = createDefaultProps({ severity: 5 });
      const { getByText } = render(<IncidentHeader {...props} />);
      const severityText = getByText('Severity 5');
      const color = getStyleProp(severityText.props.style, 'color');
      expect(color).toBe(SEVERITY_COLORS[5]);
    });

    it.each(allSeverityLevels)(
      'severity %i text uses SEVERITY_COLORS[%i]',
      (severity) => {
        const props = createDefaultProps({ severity });
        const { getByText } = render(<IncidentHeader {...props} />);
        const severityText = getByText(`Severity ${severity}`);
        const color = getStyleProp(severityText.props.style, 'color');
        expect(color).toBe(SEVERITY_COLORS[severity]);
      }
    );
  });

  // =============================================================================
  // VERIFIED BADGE TESTS
  // =============================================================================

  describe('Verified Badge', () => {
    it('shows verified badge when verified is true', () => {
      const props = createDefaultProps({ verified: true });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Verified')).toBeTruthy();
    });

    it('shows verified badge by default (defaults to true)', () => {
      const props = {
        type: 'fire' as IncidentType,
        title: 'Test',
        severity: 3 as Severity,
        occurredAtMs: Date.now(),
        // verified not specified - should default to true
      };
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Verified')).toBeTruthy();
    });

    it('hides verified badge when verified is false', () => {
      const props = createDefaultProps({ verified: false });
      const { queryByText } = render(<IncidentHeader {...props} />);
      expect(queryByText('Verified')).toBeNull();
    });

    it('verified badge has success color', () => {
      const props = createDefaultProps({ verified: true });
      const { getByText } = render(<IncidentHeader {...props} />);
      const verifiedText = getByText('Verified');
      const color = getStyleProp(verifiedText.props.style, 'color');
      expect(color).toBe('#22C55E'); // success color from mock
    });
  });

  // =============================================================================
  // TIME FORMATTING TESTS
  // =============================================================================

  describe('Time Formatting', () => {
    it('displays time as "just now" for recent incidents', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() - 30000, // 30 seconds ago
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('just now')).toBeTruthy();
    });

    it('displays time in minutes for recent incidents', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() - 5 * 60000, // 5 minutes ago
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('5m ago')).toBeTruthy();
    });

    it('displays time in hours for older incidents', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() - 2 * 3600000, // 2 hours ago
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('2h ago')).toBeTruthy();
    });

    it('displays time in days for multi-day old incidents', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() - 3 * 24 * 3600000, // 3 days ago
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('3d ago')).toBeTruthy();
    });

    it('uses formatRelativeTimeMs with occurredAtMs value', () => {
      const { formatRelativeTimeMs } = require('@lib/utils/time');
      const timestamp = Date.now() - 3600000;
      const props = createDefaultProps({ occurredAtMs: timestamp });

      render(<IncidentHeader {...props} />);

      expect(formatRelativeTimeMs).toHaveBeenCalledWith(timestamp);
    });
  });

  // =============================================================================
  // TITLE TESTS
  // =============================================================================

  describe('Title Display', () => {
    it('renders title text', () => {
      const props = createDefaultProps({ title: 'Major Fire Downtown' });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Major Fire Downtown')).toBeTruthy();
    });

    it('handles long titles with numberOfLines limit', () => {
      const props = createDefaultProps({
        title:
          'This is a very long incident title that should be truncated after two lines to prevent layout issues',
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      const titleElement = getByText(props.title);
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('handles empty title', () => {
      const props = createDefaultProps({ title: '' });
      const { toJSON } = render(<IncidentHeader {...props} />);
      expect(toJSON()).not.toBeNull();
    });

    it('handles special characters in title', () => {
      const props = createDefaultProps({
        title: 'Fire at 123 Main St. & Oak Ave.',
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Fire at 123 Main St. & Oak Ave.')).toBeTruthy();
    });

    it('handles unicode characters in title', () => {
      const props = createDefaultProps({
        title: 'Emergency at location',
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('Emergency at location')).toBeTruthy();
    });
  });

  // =============================================================================
  // STYLING TESTS
  // =============================================================================

  describe('Styling', () => {
    it('uses flexDirection row for main container', () => {
      const props = createDefaultProps();
      const { toJSON } = render(<IncidentHeader {...props} />);
      const tree = toJSON();
      expect(tree?.props.style).toEqual(
        expect.objectContaining({ flexDirection: 'row' })
      );
    });

    it('title has bold font weight', () => {
      const props = createDefaultProps();
      const { getByText } = render(<IncidentHeader {...props} />);
      const title = getByText('Test Incident Title');
      const fontWeight = getStyleProp(title.props.style, 'fontWeight');
      expect(fontWeight).toBe('700');
    });

    it('type label uses uppercase', () => {
      const props = createDefaultProps({ type: 'fire' });
      const { getByText } = render(<IncidentHeader {...props} />);
      // The label should be uppercase
      expect(getByText('FIRE')).toBeTruthy();
    });

    it('type label has letter spacing', () => {
      const props = createDefaultProps({ type: 'fire' });
      const { getByText } = render(<IncidentHeader {...props} />);
      const label = getByText('FIRE');
      const letterSpacing = getStyleProp(label.props.style, 'letterSpacing');
      expect(letterSpacing).toBe(0.5);
    });
  });

  // =============================================================================
  // PROP UPDATES TESTS
  // =============================================================================

  describe('Prop Updates', () => {
    it('updates when type changes', () => {
      const props = createDefaultProps({ type: 'fire' });
      const { getByText, rerender, queryByText } = render(
        <IncidentHeader {...props} />
      );

      expect(getByText('FIRE')).toBeTruthy();

      rerender(<IncidentHeader {...createDefaultProps({ type: 'medical' })} />);

      expect(queryByText('FIRE')).toBeNull();
      expect(getByText('MEDICAL')).toBeTruthy();
    });

    it('updates when severity changes', () => {
      const props = createDefaultProps({ severity: 2 });
      const { getByText, rerender, queryByText } = render(
        <IncidentHeader {...props} />
      );

      expect(getByText('Severity 2')).toBeTruthy();

      rerender(<IncidentHeader {...createDefaultProps({ severity: 5 })} />);

      expect(queryByText('Severity 2')).toBeNull();
      expect(getByText('Severity 5')).toBeTruthy();
    });

    it('updates when title changes', () => {
      const props = createDefaultProps({ title: 'Original Title' });
      const { getByText, rerender, queryByText } = render(
        <IncidentHeader {...props} />
      );

      expect(getByText('Original Title')).toBeTruthy();

      rerender(<IncidentHeader {...createDefaultProps({ title: 'New Title' })} />);

      expect(queryByText('Original Title')).toBeNull();
      expect(getByText('New Title')).toBeTruthy();
    });

    it('updates verified badge when verified prop changes', () => {
      const props = createDefaultProps({ verified: true });
      const { getByText, rerender, queryByText } = render(
        <IncidentHeader {...props} />
      );

      expect(getByText('Verified')).toBeTruthy();

      rerender(<IncidentHeader {...createDefaultProps({ verified: false })} />);

      expect(queryByText('Verified')).toBeNull();
    });
  });

  // =============================================================================
  // TYPE CONFIG VERIFICATION
  // =============================================================================

  describe('Type Config Verification', () => {
    it('fire type has local-fire-department icon', () => {
      expect(TYPE_CONFIG.fire.icon).toBe('local-fire-department');
    });

    it('medical type has medical-services icon', () => {
      expect(TYPE_CONFIG.medical.icon).toBe('medical-services');
    });

    it('traffic type has traffic icon', () => {
      expect(TYPE_CONFIG.traffic.icon).toBe('traffic');
    });

    it('transit type has directions-transit icon', () => {
      expect(TYPE_CONFIG.transit.icon).toBe('directions-transit');
    });

    it('weather type has wb-sunny icon', () => {
      expect(TYPE_CONFIG.weather.icon).toBe('wb-sunny');
    });

    it('public_health type has local-hospital icon', () => {
      expect(TYPE_CONFIG.public_health.icon).toBe('local-hospital');
    });

    it('violent_crime type has warning icon', () => {
      expect(TYPE_CONFIG.violent_crime.icon).toBe('warning');
    });

    it('property_crime type has home icon', () => {
      expect(TYPE_CONFIG.property_crime.icon).toBe('home');
    });

    it('disturbance type has volume-up icon', () => {
      expect(TYPE_CONFIG.disturbance.icon).toBe('volume-up');
    });

    it('suspicious type has visibility icon', () => {
      expect(TYPE_CONFIG.suspicious.icon).toBe('visibility');
    });

    it('other type has info icon', () => {
      expect(TYPE_CONFIG.other.icon).toBe('info');
    });

    it.each(allIncidentTypes)('%s type has gradient colors', (type) => {
      const config = TYPE_CONFIG[type];
      expect(config.gradient).toHaveLength(2);
      expect(config.gradient[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.gradient[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles timestamp of 0', () => {
      const props = createDefaultProps({ occurredAtMs: 0 });
      const { toJSON } = render(<IncidentHeader {...props} />);
      expect(toJSON()).not.toBeNull();
    });

    it('handles future timestamp', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() + 3600000, // 1 hour in future
      });
      const { getByText } = render(<IncidentHeader {...props} />);
      expect(getByText('just now')).toBeTruthy();
    });

    it('handles very old timestamp', () => {
      const props = createDefaultProps({
        occurredAtMs: Date.now() - 365 * 24 * 3600000, // 1 year ago
      });
      const { toJSON } = render(<IncidentHeader {...props} />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders consistently across multiple renders', () => {
      const props = createDefaultProps();

      const { toJSON: toJSON1 } = render(<IncidentHeader {...props} />);
      const { toJSON: toJSON2 } = render(<IncidentHeader {...props} />);

      // Structure should be identical (excluding timestamp which may have changed)
      expect(JSON.stringify(toJSON1()?.type)).toEqual(
        JSON.stringify(toJSON2()?.type)
      );
    });
  });
});
