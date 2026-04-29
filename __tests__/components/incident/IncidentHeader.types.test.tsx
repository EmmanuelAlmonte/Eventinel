/**
 * IncidentHeader incident type labels, colors, and config behavior.
 *
 * @jest-environment jsdom
 */

import { TYPE_CONFIG } from '@lib/nostr/config';
import type { IncidentType } from '@lib/nostr/config';
import {
  allIncidentTypes,
  getStyleProp,
  renderIncidentHeader,
  resetIncidentHeaderMocks,
} from './incidentHeaderTestHarness';

describe('IncidentHeader type display', () => {
  beforeEach(resetIncidentHeaderMocks);

  it.each(allIncidentTypes)('renders %s incident type correctly', (type) => {
    const config = TYPE_CONFIG[type];
    const { getByText } = renderIncidentHeader({ type });

    expect(getByText(config.label.toUpperCase())).toBeTruthy();
  });

  it.each([
    ['fire', 'FIRE'],
    ['medical', 'MEDICAL'],
    ['traffic', 'TRAFFIC'],
    ['transit', 'TRANSIT'],
    ['weather', 'WEATHER'],
    ['public_health', 'PUBLIC HEALTH'],
    ['violent_crime', 'CRIME'],
    ['property_crime', 'PROPERTY CRIME'],
    ['disturbance', 'DISTURBANCE'],
    ['suspicious', 'SUSPICIOUS'],
    ['other', 'OTHER'],
  ] as Array<[IncidentType, string]>)('displays %s label', (type, label) => {
    const { getByText } = renderIncidentHeader({ type });
    expect(getByText(label)).toBeTruthy();
  });

  it('falls back to other config for unknown type', () => {
    const { getByText } = renderIncidentHeader({
      type: 'unknown_type' as IncidentType,
    });

    expect(getByText('OTHER')).toBeTruthy();
  });

  it.each(allIncidentTypes)('%s type uses correct color from TYPE_CONFIG', (type) => {
    const config = TYPE_CONFIG[type];
    const { getByText } = renderIncidentHeader({ type });
    const label = getByText(config.label.toUpperCase());

    expect(getStyleProp(label.props.style, 'color')).toBe(config.color);
  });

  it('type label uses uppercase and letter spacing', () => {
    const { getByText } = renderIncidentHeader({ type: 'fire' });
    const label = getByText('FIRE');

    expect(label).toBeTruthy();
    expect(getStyleProp(label.props.style, 'letterSpacing')).toBe(0.5);
  });

  it.each([
    ['fire', 'local-fire-department'],
    ['medical', 'medical-services'],
    ['traffic', 'traffic'],
    ['transit', 'directions-transit'],
    ['weather', 'wb-sunny'],
    ['public_health', 'local-hospital'],
    ['violent_crime', 'warning'],
    ['property_crime', 'home'],
    ['disturbance', 'volume-up'],
    ['suspicious', 'visibility'],
    ['other', 'info'],
  ] as Array<[IncidentType, string]>)('%s type has expected icon', (type, icon) => {
    expect(TYPE_CONFIG[type].icon).toBe(icon);
  });

  it.each(allIncidentTypes)('%s type has gradient colors', (type) => {
    const config = TYPE_CONFIG[type];

    expect(config.gradient).toHaveLength(2);
    expect(config.gradient[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(config.gradient[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
