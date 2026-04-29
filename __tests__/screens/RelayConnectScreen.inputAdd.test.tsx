/**
 * RelayConnectScreen input, validation, and add-relay tests.
 *
 * @jest-environment jsdom
 */

import { act, fireEvent } from '@testing-library/react-native';

import {
  cleanupRelayConnectScreenTest,
  mockAddExplicitRelay,
  mockAddRelayToStorage,
  renderRelayConnectScreen,
  setupRelayConnectScreenTest,
} from './relayConnectScreenTestHarness';

function getAddRelayButton(getAllByText: (text: string) => unknown[]) {
  return getAllByText('Add relay')[1];
}

describe('RelayConnectScreen relay URL input', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('renders relay URL input placeholder', () => {
    const { getByPlaceholderText } = renderRelayConnectScreen();
    expect(getByPlaceholderText('wss://relay.example.com')).toBeTruthy();
  });

  it('renders connect button', () => {
    const { getAllByText } = renderRelayConnectScreen();
    expect(getAddRelayButton(getAllByText)).toBeTruthy();
  });

  it('allows typing relay URL', () => {
    const { getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    expect(input.props.value).toBe('wss://new-relay.com');
  });

  it('renders link icon in input', () => {
    const { getByTestId } = renderRelayConnectScreen();
    expect(getByTestId('icon-link')).toBeTruthy();
  });

  it('renders add icon in connect button', () => {
    const { getByTestId } = renderRelayConnectScreen();
    expect(getByTestId('icon-add')).toBeTruthy();
  });
});

describe('RelayConnectScreen URL validation', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('disables add relay when URL is empty', () => {
    const { getAllByRole } = renderRelayConnectScreen();
    const buttons = getAllByRole('button');
    const addButton = buttons[buttons.length - 1];

    expect(addButton.props.accessibilityState).toEqual({ disabled: true });
  });

  it('shows error for invalid URL without wss:// prefix', async () => {
    const { getAllByText, getByTestId, getByText } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'relay.example.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(getByText('Relay URL must start with wss:// or ws://')).toBeTruthy();
  });

  it('accepts wss:// URLs', async () => {
    const { getAllByText, getByTestId, queryByText } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://valid-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(queryByText('Relay URL must start with wss:// or ws://')).toBeNull();
    expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://valid-relay.com');
  });

  it('accepts ws:// URLs', async () => {
    const { getAllByText, getByTestId, queryByText } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'ws://local-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(queryByText('Relay URL must start with wss:// or ws://')).toBeNull();
    expect(mockAddExplicitRelay).toHaveBeenCalledWith('ws://local-relay.com');
  });

  it('trims whitespace from URL', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, '  wss://relay.com  ');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://relay.com');
  });
});

describe('RelayConnectScreen adding relays', () => {
  beforeEach(setupRelayConnectScreenTest);
  afterEach(cleanupRelayConnectScreenTest);

  it('adds relay to NDK pool', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(mockAddExplicitRelay).toHaveBeenCalledWith('wss://new-relay.com');
  });

  it('saves relay to storage', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(mockAddRelayToStorage).toHaveBeenCalledWith('wss://new-relay.com');
  });

  it('clears input after adding relay', async () => {
    const { getAllByText, getByTestId } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(input.props.value).toBe('');
  });

  it('shows connecting message after adding', async () => {
    const { getAllByText, getByTestId, getByText } = renderRelayConnectScreen();
    const input = getByTestId('relay-url-input');

    fireEvent.changeText(input, 'wss://new-relay.com');

    await act(async () => {
      fireEvent.press(getAddRelayButton(getAllByText));
    });

    expect(getByText(/Connecting to wss:\/\/new-relay.com/)).toBeTruthy();
  });
});
