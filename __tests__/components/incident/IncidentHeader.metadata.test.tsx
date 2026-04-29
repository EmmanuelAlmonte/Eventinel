/**
 * IncidentHeader severity, verified badge, and time metadata behavior.
 *
 * @jest-environment jsdom
 */

import { SEVERITY_COLORS } from '@lib/nostr/config';
import { render } from '@testing-library/react-native';
import type { IncidentType, Severity } from '@lib/nostr/config';
import {
  IncidentHeader,
  allSeverityLevels,
  formatRelativeTimeMsMock,
  getStyleProp,
  renderIncidentHeader,
  resetIncidentHeaderMocks,
} from './incidentHeaderTestHarness';

describe('IncidentHeader metadata display', () => {
  beforeEach(resetIncidentHeaderMocks);

  it.each(allSeverityLevels)('displays severity %i correctly', (severity) => {
    const { getByText } = renderIncidentHeader({ severity });
    expect(getByText(`Severity ${severity}`)).toBeTruthy();
  });

  it.each(allSeverityLevels)(
    'severity %i text uses SEVERITY_COLORS[%i]',
    (severity) => {
      const { getByText } = renderIncidentHeader({ severity });
      const severityText = getByText(`Severity ${severity}`);

      expect(getStyleProp(severityText.props.style, 'color')).toBe(
        SEVERITY_COLORS[severity]
      );
    }
  );

  it('shows verified badge when verified is true', () => {
    const { getByText } = renderIncidentHeader({ verified: true });
    expect(getByText('Verified')).toBeTruthy();
  });

  it('shows verified badge by default', () => {
    const props = {
      type: 'fire' as IncidentType,
      title: 'Test',
      severity: 3 as Severity,
      occurredAtMs: Date.now(),
    };
    const { getByText } = render(<IncidentHeader {...props} />);

    expect(getByText('Verified')).toBeTruthy();
  });

  it('hides verified badge when verified is false', () => {
    const { queryByText } = renderIncidentHeader({ verified: false });
    expect(queryByText('Verified')).toBeNull();
  });

  it('verified badge has success color', () => {
    const { getByText } = renderIncidentHeader({ verified: true });
    const verifiedText = getByText('Verified');

    expect(getStyleProp(verifiedText.props.style, 'color')).toBe('#22C55E');
  });

  it('displays time as just now for recent incidents', () => {
    const { getByText } = renderIncidentHeader({
      occurredAtMs: Date.now() - 30000,
    });

    expect(getByText('just now')).toBeTruthy();
  });

  it('displays time in minutes for recent incidents', () => {
    const { getByText } = renderIncidentHeader({
      occurredAtMs: Date.now() - 5 * 60000,
    });

    expect(getByText('5m ago')).toBeTruthy();
  });

  it('displays time in hours for older incidents', () => {
    const { getByText } = renderIncidentHeader({
      occurredAtMs: Date.now() - 2 * 3600000,
    });

    expect(getByText('2h ago')).toBeTruthy();
  });

  it('displays time in days for multi-day old incidents', () => {
    const { getByText } = renderIncidentHeader({
      occurredAtMs: Date.now() - 3 * 24 * 3600000,
    });

    expect(getByText('3d ago')).toBeTruthy();
  });

  it('uses formatRelativeTimeMs with occurredAtMs value', () => {
    const timestamp = Date.now() - 3600000;

    renderIncidentHeader({ occurredAtMs: timestamp });

    expect(formatRelativeTimeMsMock).toHaveBeenCalledWith(timestamp);
  });

  it('handles timestamp of 0', () => {
    const { toJSON } = renderIncidentHeader({ occurredAtMs: 0 });
    expect(toJSON()).not.toBeNull();
  });

  it('handles future timestamp', () => {
    const { getByText } = renderIncidentHeader({
      occurredAtMs: Date.now() + 3600000,
    });

    expect(getByText('just now')).toBeTruthy();
  });

  it('handles very old timestamp', () => {
    const { toJSON } = renderIncidentHeader({
      occurredAtMs: Date.now() - 365 * 24 * 3600000,
    });

    expect(toJSON()).not.toBeNull();
  });
});
