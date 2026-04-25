/**
 * RelayConnectScreen relay list and removal tests.
 *
 * @jest-environment jsdom
 */

import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  cleanupRelayConnectScreenTest,
  mockRemoveRelay,
  mockRemoveRelayFromStorage,
  renderRelayConnectScreen,
  setupRelayConnectScreenTest,
} from './relayConnectScreenTestHarness';

describe('RelayConnectScreen relay list', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('displays relay URLs', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('wss://relay1.com')).toBeTruthy();
    expect(getByText('wss://relay2.com')).toBeTruthy();
  });

  it('displays relay status text', () => {
    const { getByText } = renderRelayConnectScreen();
    expect(getByText('Connected')).toBeTruthy();
    expect(getByText('Connecting')).toBeTruthy();
  });

  it('renders remove buttons for each relay', () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove/);
    expect(removeButtons.length).toBe(2);
  });
});

describe('RelayConnectScreen removing relays', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('shows confirmation alert when remove is pressed', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Disconnect Relay',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('confirmation alert includes relay URL', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove wss:\/\/relay1.com/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Disconnect Relay',
      expect.stringContaining('wss://relay1.com'),
      expect.any(Array)
    );
  });

  it('provides cancel option in confirmation', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const cancelButton = buttons.find((b: any) => b.text === 'Cancel');

    expect(cancelButton).toBeDefined();
    expect(cancelButton.style).toBe('cancel');
  });

  it('provides destructive remove option', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const removeButton = buttons.find((b: any) => b.text === 'Remove');

    expect(removeButton).toBeDefined();
    expect(removeButton.style).toBe('destructive');
  });

  it('removes relay from pool when confirmed', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove wss:\/\/relay1.com/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const removeButton = buttons.find((b: any) => b.text === 'Remove');

    await act(async () => {
      removeButton.onPress();
    });

    expect(mockRemoveRelay).toHaveBeenCalledWith('wss://relay1.com');
  });

  it('removes relay from storage when confirmed', async () => {
    const { getAllByLabelText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove wss:\/\/relay1.com/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const removeButton = buttons.find((b: any) => b.text === 'Remove');

    await act(async () => {
      removeButton.onPress();
    });

    expect(mockRemoveRelayFromStorage).toHaveBeenCalledWith('wss://relay1.com');
  });

  it('shows removed message after removal', async () => {
    const { getAllByLabelText, getByText } = renderRelayConnectScreen();
    const removeButtons = getAllByLabelText(/Remove wss:\/\/relay1.com/);

    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const removeButton = buttons.find((b: any) => b.text === 'Remove');

    await act(async () => {
      removeButton.onPress();
    });

    await waitFor(() => {
      expect(getByText(/Removed wss:\/\/relay1.com/)).toBeTruthy();
    });
  });
});
