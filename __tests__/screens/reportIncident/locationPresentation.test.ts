/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react-native';
import { reverseGeocodeAsync } from '../../../__mocks__/expo-location';
import { useResolvedReportLocation } from '../../../screens/reportIncident/locationPresentation';

async function flushLocationResolutionTimer() {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
}

describe('useResolvedReportLocation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not expose a resolved place from previous coordinates while a new cache miss is pending', async () => {
    const previousLocation = { latitude: 40.03836, longitude: -75.05134 };
    const nextLocation = { latitude: 40.04111, longitude: -75.06111 };
    let resolveNextLocation: (value: any[]) => void = () => undefined;

    jest.mocked(reverseGeocodeAsync)
      .mockResolvedValueOnce([
        {
          streetNumber: '3127',
          street: 'Princeton Avenue',
          district: null,
          city: 'Philadelphia',
          region: 'PA',
        },
      ] as any)
      .mockImplementationOnce(
        () =>
          new Promise<any[]>((resolve) => {
            resolveNextLocation = resolve;
          })
      );

    const { result, rerender } = renderHook(
      ({ location }) => useResolvedReportLocation(location),
      { initialProps: { location: previousLocation } }
    );

    await flushLocationResolutionTimer();

    expect(result.current.resolvedPlaceLabel).toBe('3100 block Princeton Avenue');
    expect(result.current.resolvedContextLine).toBe('Philadelphia, PA');

    rerender({ location: nextLocation });

    expect(result.current.resolvedPlaceLabel).toBeNull();
    expect(result.current.resolvedContextLine).toBeNull();

    await flushLocationResolutionTimer();

    expect(result.current.isResolvingPlace).toBe(true);

    await act(async () => {
      resolveNextLocation([
        {
          streetNumber: '210',
          street: 'Market Street',
          district: null,
          city: 'Philadelphia',
          region: 'PA',
        },
      ]);
    });

    expect(result.current.resolvedPlaceLabel).toBe('200 block Market Street');
    expect(result.current.resolvedContextLine).toBe('Philadelphia, PA');
    expect(result.current.isResolvingPlace).toBe(false);
  });
});
