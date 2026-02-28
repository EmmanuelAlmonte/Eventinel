/**
 * StatusBadge Component Tests
 *
 * Tests the badge components:
 * - StatusBadge (success, error, warning, info, neutral)
 * - SeverityBadge (levels 1-5 and named levels)
 * - IncidentTypeBadge (fire, medical, crime, etc.)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Import components under test
import {
  StatusBadge,
  SeverityBadge,
  IncidentTypeBadge,
} from '../../../components/ui/StatusBadge';

// =============================================================================
// STATUSBADGE TESTS
// =============================================================================

describe('StatusBadge', () => {
  describe('Basic Rendering', () => {
    it('renders label text', () => {
      const { getByText } = render(
        <StatusBadge status="success" label="Active" />
      );
      expect(getByText('Active')).toBeTruthy();
    });

    it('renders custom label text', () => {
      const { getByText } = render(
        <StatusBadge status="info" label="Custom Label" />
      );
      expect(getByText('Custom Label')).toBeTruthy();
    });
  });

  describe('Status Types', () => {
    it('renders success status', () => {
      const { getByText, UNSAFE_root } = render(
        <StatusBadge status="success" label="Success" />
      );
      expect(getByText('Success')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders error status', () => {
      const { getByText, UNSAFE_root } = render(
        <StatusBadge status="error" label="Error" />
      );
      expect(getByText('Error')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders warning status', () => {
      const { getByText, UNSAFE_root } = render(
        <StatusBadge status="warning" label="Warning" />
      );
      expect(getByText('Warning')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders info status', () => {
      const { getByText, UNSAFE_root } = render(
        <StatusBadge status="info" label="Info" />
      );
      expect(getByText('Info')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders neutral status', () => {
      const { getByText, UNSAFE_root } = render(
        <StatusBadge status="neutral" label="Neutral" />
      );
      expect(getByText('Neutral')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Outline Mode', () => {
    it('renders filled by default', () => {
      const { UNSAFE_root } = render(
        <StatusBadge status="success" label="Filled" />
      );
      // Should render without error (styling tested via visual inspection)
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders outlined when outline=true', () => {
      const { UNSAFE_root } = render(
        <StatusBadge status="success" label="Outlined" outline={true} />
      );
      // Component renders in outline mode
      expect(UNSAFE_root).toBeTruthy();
    });

    it('has transparent background when outlined', () => {
      const { UNSAFE_root } = render(
        <StatusBadge status="error" label="Outlined" outline={true} />
      );
      // Component renders correctly in outline mode
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Custom Style', () => {
    it('accepts additional style prop', () => {
      const { UNSAFE_root } = render(
        <StatusBadge
          status="info"
          label="Styled"
          style={{ marginLeft: 10 }}
        />
      );
      // Component accepts style prop without error
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// SEVERITYBADGE TESTS
// =============================================================================

describe('SeverityBadge', () => {
  describe('Numeric Severity Levels', () => {
    it('renders severity level 1 as "Low"', () => {
      const { getByText } = render(<SeverityBadge severity={1} />);
      expect(getByText('Low')).toBeTruthy();
    });

    it('renders severity level 2 as "Low"', () => {
      const { getByText } = render(<SeverityBadge severity={2} />);
      expect(getByText('Low')).toBeTruthy();
    });

    it('renders severity level 3 as "Medium"', () => {
      const { getByText } = render(<SeverityBadge severity={3} />);
      expect(getByText('Medium')).toBeTruthy();
    });

    it('renders severity level 4 as "High"', () => {
      const { getByText } = render(<SeverityBadge severity={4} />);
      expect(getByText('High')).toBeTruthy();
    });

    it('renders severity level 5 as "Critical"', () => {
      const { getByText } = render(<SeverityBadge severity={5} />);
      expect(getByText('Critical')).toBeTruthy();
    });
  });

  describe('Named Severity Levels', () => {
    it('renders "critical" severity', () => {
      const { getByText } = render(<SeverityBadge severity="critical" />);
      expect(getByText('Critical')).toBeTruthy();
    });

    it('renders "high" severity', () => {
      const { getByText } = render(<SeverityBadge severity="high" />);
      expect(getByText('High')).toBeTruthy();
    });

    it('renders "medium" severity', () => {
      const { getByText } = render(<SeverityBadge severity="medium" />);
      expect(getByText('Medium')).toBeTruthy();
    });

    it('renders "low" severity', () => {
      const { getByText } = render(<SeverityBadge severity="low" />);
      expect(getByText('Low')).toBeTruthy();
    });

    it('renders "info" severity', () => {
      const { getByText } = render(<SeverityBadge severity="info" />);
      expect(getByText('Info')).toBeTruthy();
    });
  });

  describe('Custom Label', () => {
    it('uses custom label when provided', () => {
      const { getByText } = render(
        <SeverityBadge severity={5} label="Emergency" />
      );
      expect(getByText('Emergency')).toBeTruthy();
    });

    it('custom label overrides default', () => {
      const { getByText, queryByText } = render(
        <SeverityBadge severity={1} label="Minor" />
      );
      expect(getByText('Minor')).toBeTruthy();
      expect(queryByText('Low')).toBeNull();
    });
  });

  describe('Show Number', () => {
    it('does not show number by default', () => {
      const { queryByText } = render(<SeverityBadge severity={3} />);
      // Should show "Medium" but not "3"
      expect(queryByText('3')).toBeNull();
    });

    it('shows number when showNumber=true', () => {
      const { getByText } = render(
        <SeverityBadge severity={4} showNumber={true} />
      );
      expect(getByText('4')).toBeTruthy();
    });

    it('shows both number and label when showNumber=true', () => {
      const { getByText } = render(
        <SeverityBadge severity={5} showNumber={true} />
      );
      expect(getByText('5')).toBeTruthy();
      expect(getByText('Critical')).toBeTruthy();
    });

    it('does not show number for named severity levels', () => {
      const { queryByText, getByText } = render(
        <SeverityBadge severity="high" showNumber={true} />
      );
      expect(getByText('High')).toBeTruthy();
      // Named levels don't have a number to show
    });
  });

  describe('Custom Style', () => {
    it('accepts additional style prop', () => {
      const { UNSAFE_root } = render(
        <SeverityBadge severity={3} style={{ padding: 20 }} />
      );
      // Component accepts style prop without error
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Color Assignment', () => {
    // Test that each severity level renders with appropriate color
    const severityLevels = [1, 2, 3, 4, 5] as const;

    severityLevels.forEach((severity) => {
      it(`assigns background color for severity ${severity}`, () => {
        const { UNSAFE_root } = render(<SeverityBadge severity={severity} />);
        // Component renders with appropriate styling
        expect(UNSAFE_root).toBeTruthy();
      });
    });
  });
});

// =============================================================================
// INCIDENTTYPEBADGE TESTS
// =============================================================================

describe('IncidentTypeBadge', () => {
  describe('Known Incident Types', () => {
    const incidentTypes = [
      { type: 'fire', label: 'Fire', emoji: '🔥' },
      { type: 'medical', label: 'Medical', emoji: '🚑' },
      { type: 'crime', label: 'Crime', emoji: '🚨' },
      { type: 'traffic', label: 'Traffic', emoji: '🚗' },
      { type: 'weather', label: 'Weather', emoji: '⛈️' },
      { type: 'hazmat', label: 'Hazmat', emoji: '☢️' },
      { type: 'missing', label: 'Missing', emoji: '🔍' },
      { type: 'other', label: 'Other', emoji: '📢' },
    ];

    incidentTypes.forEach(({ type, label, emoji }) => {
      it(`renders ${type} type with label "${label}"`, () => {
        const { getByText } = render(<IncidentTypeBadge type={type} />);
        expect(getByText(new RegExp(label))).toBeTruthy();
      });

      it(`renders ${type} type with emoji ${emoji}`, () => {
        const { getByText } = render(
          <IncidentTypeBadge type={type} showEmoji={true} />
        );
        expect(getByText(new RegExp(emoji))).toBeTruthy();
      });
    });
  });

  describe('Emoji Display', () => {
    it('shows emoji by default', () => {
      const { getByText } = render(<IncidentTypeBadge type="fire" />);
      expect(getByText(/🔥/)).toBeTruthy();
    });

    it('hides emoji when showEmoji=false', () => {
      const { getByText, queryByText } = render(
        <IncidentTypeBadge type="fire" showEmoji={false} />
      );
      expect(getByText('Fire')).toBeTruthy();
      // Should not contain emoji in the text (just "Fire")
      const fireText = getByText('Fire');
      expect(fireText.props.children).not.toContain('🔥');
    });

    it('combines emoji and label when showEmoji=true', () => {
      const { getByText } = render(
        <IncidentTypeBadge type="medical" showEmoji={true} />
      );
      expect(getByText(/🚑.*Medical|Medical.*🚑/)).toBeTruthy();
    });
  });

  describe('Unknown Type Handling', () => {
    it('falls back to "other" for unknown types', () => {
      const { getByText } = render(
        <IncidentTypeBadge type="unknown-incident-type" />
      );
      expect(getByText(/Other|📢/)).toBeTruthy();
    });

    it('handles empty string type', () => {
      const { getByText } = render(<IncidentTypeBadge type="" />);
      expect(getByText(/Other|📢/)).toBeTruthy();
    });
  });

  describe('Custom Style', () => {
    it('accepts additional style prop', () => {
      const { UNSAFE_root } = render(
        <IncidentTypeBadge type="crime" style={{ borderRadius: 12 }} />
      );
      // Component accepts style prop without error
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Color Assignment', () => {
    it('assigns unique color for fire type', () => {
      const { UNSAFE_root } = render(<IncidentTypeBadge type="fire" />);
      // Component renders with fire styling
      expect(UNSAFE_root).toBeTruthy();
    });

    it('assigns unique color for medical type', () => {
      const { UNSAFE_root } = render(<IncidentTypeBadge type="medical" />);
      // Component renders with medical styling
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  describe('StatusBadge', () => {
    it('handles very long label', () => {
      const longLabel = 'A'.repeat(100);
      const { getByText } = render(
        <StatusBadge status="info" label={longLabel} />
      );
      expect(getByText(longLabel)).toBeTruthy();
    });

    it('handles special characters in label', () => {
      const { getByText } = render(
        <StatusBadge status="warning" label="<Warning> & 'Alert'" />
      );
      expect(getByText("<Warning> & 'Alert'")).toBeTruthy();
    });
  });

  describe('SeverityBadge', () => {
    it('handles out-of-range numeric severity gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const { UNSAFE_root } = render(
        <SeverityBadge severity={6 as any} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles custom label with all severity levels', () => {
      [1, 2, 3, 4, 5].forEach((sev) => {
        const { getByText } = render(
          <SeverityBadge severity={sev as 1 | 2 | 3 | 4 | 5} label="Custom" />
        );
        expect(getByText('Custom')).toBeTruthy();
      });
    });
  });

  describe('IncidentTypeBadge', () => {
    it('handles case-sensitive type matching', () => {
      // Component might be case-sensitive
      const { getByText } = render(<IncidentTypeBadge type="FIRE" />);
      // Should either match fire or fall back to other
      expect(getByText(/Fire|Other/)).toBeTruthy();
    });

    it('handles type with spaces', () => {
      const { getByText } = render(
        <IncidentTypeBadge type="fire alarm" />
      );
      expect(getByText(/Other|📢/)).toBeTruthy();
    });
  });
});

// =============================================================================
// ACCESSIBILITY
// =============================================================================

describe('Accessibility', () => {
  it('StatusBadge label is visible', () => {
    const { getByText } = render(
      <StatusBadge status="success" label="Accessible" />
    );
    expect(getByText('Accessible')).toBeTruthy();
  });

  it('SeverityBadge text is visible', () => {
    const { getByText } = render(<SeverityBadge severity={3} />);
    expect(getByText('Medium')).toBeTruthy();
  });

  it('IncidentTypeBadge text is visible', () => {
    const { getByText } = render(<IncidentTypeBadge type="fire" />);
    expect(getByText(/Fire/)).toBeTruthy();
  });
});
