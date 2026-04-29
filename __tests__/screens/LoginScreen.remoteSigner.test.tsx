/**
 * LoginScreen NIP-46 remote signer behavior.
 *
 * @jest-environment jsdom
 */

import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  LOGIN_TOAST_OPTIONS,
  REMOTE_SIGNER_BUTTON,
  enterRemoteSignerAndSubmit,
  mockShowToast,
  renderLoginScreen,
  resetLoginScreenMocks,
  useNDK,
  useNDKSessionLogin,
} from './loginScreenTestHarness';

describe('LoginScreen remote signer login', () => {
  beforeEach(resetLoginScreenMocks);

  it('shows error for empty remote signer input', async () => {
    const { getByText } = renderLoginScreen();

    fireEvent.press(getByText(REMOTE_SIGNER_BUTTON));

    await waitFor(() => {
      expect(mockShowToast.warning).toHaveBeenCalledWith(
        'Missing Identifier',
        'Please enter a bunker URL or NIP-05 identifier'
      );
    });
  });

  it('shows error when NDK is not initialized', async () => {
    (useNDK as jest.Mock).mockReturnValue({ ndk: null });

    enterRemoteSignerAndSubmit(
      renderLoginScreen(),
      'bunker://abc123?relay=wss://relay.example.com'
    );

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Error',
        'NDK not initialized'
      );
    });
  });

  it('calls login with bunker URL', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterRemoteSignerAndSubmit(
      renderLoginScreen(),
      'bunker://abc123?relay=wss://relay.example.com'
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('displays error when bunker connection fails', async () => {
    const mockLogin = jest.fn().mockRejectedValue(new Error('Connection timeout'));
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterRemoteSignerAndSubmit(
      renderLoginScreen(),
      'bunker://abc123?relay=wss://relay.example.com'
    );

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Connection Failed',
        'Connection timeout',
        LOGIN_TOAST_OPTIONS
      );
    });
  });

  it('trims whitespace from bunker URL', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterRemoteSignerAndSubmit(
      renderLoginScreen(),
      '  bunker://abc123?relay=wss://relay.example.com  '
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('calls login with NIP-05 identifier', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterRemoteSignerAndSubmit(renderLoginScreen(), 'alice@example.com');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows error for invalid remote signer input', async () => {
    enterRemoteSignerAndSubmit(renderLoginScreen(), 'http://not-valid');

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Invalid Identifier',
        'Enter a bunker:// URL or name@domain'
      );
    });
  });
});
