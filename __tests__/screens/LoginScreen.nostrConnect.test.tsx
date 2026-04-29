/**
 * LoginScreen Nostr Connect behavior.
 *
 * @jest-environment jsdom
 */

import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  NOSTR_CONNECT_BUTTON,
  enterRelayAndGenerate,
  mockShowToast,
  renderLoginScreen,
  resetLoginScreenMocks,
  useNDKSessionLogin,
} from './loginScreenTestHarness';

describe('LoginScreen Nostr Connect', () => {
  beforeEach(resetLoginScreenMocks);

  it('shows error for empty relay URL', async () => {
    const screen = renderLoginScreen();

    fireEvent.press(screen.getByText('Nostr Connect'));
    fireEvent.press(screen.getByText(NOSTR_CONNECT_BUTTON));

    await waitFor(() => {
      expect(mockShowToast.warning).toHaveBeenCalledWith(
        'Missing Relay',
        'Please enter a relay URL'
      );
    });
  });

  it('shows error for invalid relay URL', async () => {
    enterRelayAndGenerate(renderLoginScreen(), 'https://relay.example.com');

    await waitFor(() => {
      expect(mockShowToast.warning).toHaveBeenCalledWith(
        'Invalid Relay',
        'Relay URL must start with wss:// or ws://'
      );
    });
  });

  it('generates a nostr connect URI and completes login', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();
    enterRelayAndGenerate(screen, 'wss://relay.example.com');

    await waitFor(() => {
      expect(screen.getAllByText('Nostr Connect').length).toBeGreaterThan(0);
      expect(screen.getByText('I Approved in Signer')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('I Approved in Signer'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
