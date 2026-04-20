/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ReportIncidentSubmittedScreen from '../../screens/ReportIncidentSubmittedScreen';

const mockPopToTop = jest.fn();

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textMuted: '#9CA3AF',
      primary: '#2563eb',
      success: '#22c55e',
      border: '#374151',
    },
    isDark: true,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

function buildProps(routeParamOverrides: Record<string, unknown> = {}) {
  return {
    navigation: {
      popToTop: mockPopToTop,
    },
    route: {
      key: 'ReportIncidentSubmitted-key',
      name: 'ReportIncidentSubmitted',
      params: {
        incidentType: 'fire',
        locationLabel: '123 Main St, New York, NY',
        relayCount: 2,
        stillActive: true,
        sourceTab: 'Map',
        ...routeParamOverrides,
      },
    },
  } as any;
}

describe('ReportIncidentSubmittedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses send-oriented relay copy instead of claiming publish confirmation', () => {
    const screen = render(<ReportIncidentSubmittedScreen {...buildProps()} />);

    expect(screen.getByText('Report sent')).toBeTruthy();
    expect(screen.getByText(/Sent using 2 currently connected relays\./)).toBeTruthy();
    expect(screen.queryByText(/Published to 2 connected relays\./)).toBeNull();
  });

  it('returns to the incidents tab label when launched from incidents', () => {
    const screen = render(
      <ReportIncidentSubmittedScreen
        {...buildProps({
          sourceTab: 'Incidents',
          relayCount: 1,
          stillActive: false,
        })}
      />,
    );

    fireEvent.press(screen.getByLabelText('Back to incidents'));

    expect(screen.getByText(/Sent using 1 currently connected relay\./)).toBeTruthy();
    expect(mockPopToTop).toHaveBeenCalledTimes(1);
  });
});
