/**
 * Shared harness for IncidentHeader behavior tests.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { IncidentHeader } from '../../../components/incident/IncidentHeader';
import type { IncidentType, Severity } from '@lib/nostr/config';

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

export const allIncidentTypes: IncidentType[] = [
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

export const allSeverityLevels: Severity[] = [1, 2, 3, 4, 5];

export const createDefaultProps = (
  overrides: Partial<React.ComponentProps<typeof IncidentHeader>> = {}
): React.ComponentProps<typeof IncidentHeader> => ({
  type: 'fire',
  title: 'Test Incident Title',
  severity: 3,
  occurredAtMs: Date.now() - 3600000,
  verified: true,
  ...overrides,
});

export const renderIncidentHeader = (
  overrides: Partial<React.ComponentProps<typeof IncidentHeader>> = {}
) => render(<IncidentHeader {...createDefaultProps(overrides)} />);

export const getStyleProp = (style: unknown, prop: string): unknown => {
  if (Array.isArray(style)) {
    const found = [...style].reverse().find((item) => item?.[prop] !== undefined);
    return found?.[prop];
  }
  return (style as Record<string, unknown> | undefined)?.[prop];
};

export const formatRelativeTimeMsMock = jest.requireMock('@lib/utils/time')
  .formatRelativeTimeMs as jest.Mock;

export const resetIncidentHeaderMocks = () => {
  jest.clearAllMocks();
};

export { IncidentHeader };
