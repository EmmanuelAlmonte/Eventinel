/**
 * RelayConnectScreen empty-state, status, lifecycle, and accessibility tests.
 *
 * @jest-environment jsdom
 */

import { act, fireEvent, waitFor } from '@testing-library/react-native';

import {
  clearRelays,
  cleanupRelayConnectScreenTest,
  mockOff,
  mockOn,
  renderRelayConnectScreen,
  setupRelayConnectScreenTest,
} from './relayConnectScreenTestHarness';

describe('RelayConnectScreen empty state', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('shows empty state when no relays', () => {
    clearRelays();

    const { getByText } = renderRelayConnectScreen();
    expect(getByText('No relays configured')).toBeTruthy();
  });

  it('shows hint text in empty state', () => {
    clearRelays();

    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Add a relay below to start receiving reports and updates.')).toBeTruthy();
  });

  it('shows cloud-off icon in empty state', () => {
    clearRelays();

    const { getByTestId } = renderRelayConnectScreen();
    expect(getByTestId('icon-cloud-off')).toBeTruthy();
  });

  it('shows 0 relays in subtitle', () => {
    clearRelays();

    const { getByText } = renderRelayConnectScreen();
    expect(getByText(/Connected 0 of 0/)).toBeTruthy();
  });
});

describe('RelayConnectScreen status messages', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  function getAddRelayButton(getAllByText: (text: string) => unknown[]) {
    return getAllByText('Add relay')[1];
  }

  it('shows success styling for successful operations', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    await waitFor(() => {
      expect(getByTestId('icon-check-circle-outline')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('shows error styling for validation errors', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'relay.example.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(getByTestId('icon-error-outline')).toBeTruthy();
  });
});

describe('RelayConnectScreen event listeners', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('sets up relay connect listener on mount', () => {
    renderRelayConnectScreen();

    expect(mockOn).toHaveBeenCalledWith('relay:connect', expect.any(Function));
  });

  it('sets up relay disconnect listener on mount', () => {
    renderRelayConnectScreen();

    expect(mockOn).toHaveBeenCalledWith('relay:disconnect', expect.any(Function));
  });

  it('sets up relay connecting listener on mount', () => {
    renderRelayConnectScreen();

    expect(mockOn).toHaveBeenCalledWith('relay:connecting', expect.any(Function));
  });

  it('removes listeners on unmount', () => {
    const { unmount } = renderRelayConnectScreen();

    unmount();

    expect(mockOff).toHaveBeenCalledWith('relay:connect', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('relay:disconnect', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('relay:connecting', expect.any(Function));
  });
});

describe('RelayConnectScreen accessibility', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('disconnect buttons have accessibility labels', () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const buttons = getAllByLabelText(/Remove/);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('disconnect buttons have correct accessibility role', () => {
    const { getAllByRole } = renderRelayConnectScreen();
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
