/**
 * LoginScreen manual private-key, error, and loading behavior.
 *
 * @jest-environment jsdom
 */

import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  LOGIN_TOAST_OPTIONS,
  PRIVATE_KEY_BUTTON,
  PRIVATE_KEY_PLACEHOLDER,
  RELAY_PLACEHOLDER,
  REMOTE_SIGNER_PLACEHOLDER,
  enterPrivateKeyAndSubmit,
  mockShowToast,
  renderLoginScreen,
  resetLoginScreenMocks,
  selectLoginMethod,
  useNDKSessionLogin,
} from './loginScreenTestHarness';

describe('LoginScreen private key and loading behavior', () => {
  beforeEach(resetLoginScreenMocks);

  it('shows error for empty private key', async () => {
    const screen = renderLoginScreen();

    selectLoginMethod(screen, 'Private key');
    fireEvent.press(screen.getByText(PRIVATE_KEY_BUTTON));

    await waitFor(() => {
      expect(mockShowToast.warning).toHaveBeenCalledWith(
        'Missing Key',
        'Please enter a private key'
      );
    });
  });

  it('calls login with valid private key', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterPrivateKeyAndSubmit(renderLoginScreen(), 'a'.repeat(64));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('displays error for invalid private key', async () => {
    const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid key format'));
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterPrivateKeyAndSubmit(renderLoginScreen(), 'invalid-key');

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Login Failed',
        'Please check your key and try again',
        LOGIN_TOAST_OPTIONS
      );
    });
  });

  it('trims whitespace from private key', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterPrivateKeyAndSubmit(renderLoginScreen(), `  ${'a'.repeat(64)}  `);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('uses secure text entry for private key input', () => {
    const screen = renderLoginScreen();

    selectLoginMethod(screen, 'Private key');

    expect(screen.getByPlaceholderText(PRIVATE_KEY_PLACEHOLDER).props.secureTextEntry).toBe(
      true
    );
  });

  it('clears error when starting new login attempt', async () => {
    const mockLogin = jest
      .fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();

    enterPrivateKeyAndSubmit(screen, 'a'.repeat(64));

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Login Failed',
        'Please check your key and try again',
        LOGIN_TOAST_OPTIONS
      );
    });

    enterPrivateKeyAndSubmit(screen, 'b'.repeat(64));

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledTimes(1);
    });
  });

  it('handles non-Error exception objects', async () => {
    const mockLogin = jest.fn().mockRejectedValue('String error');
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    enterPrivateKeyAndSubmit(renderLoginScreen(), 'a'.repeat(64));

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Login Failed',
        'Please check your key and try again',
        LOGIN_TOAST_OPTIONS
      );
    });
  });

  it('shows loading overlay during login', async () => {
    const mockLogin = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();
    enterPrivateKeyAndSubmit(screen, 'a'.repeat(64));

    await waitFor(() => {
      expect(screen.queryByText('Connecting...')).toBeTruthy();
    });
  });

  it('hides loading overlay after login completes', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();
    enterPrivateKeyAndSubmit(screen, 'a'.repeat(64));

    await waitFor(() => {
      expect(screen.queryByText('Connecting...')).toBeNull();
    });
  });

  it('hides loading overlay after login fails', async () => {
    const mockLogin = jest.fn().mockRejectedValue(new Error('Failed'));
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();
    enterPrivateKeyAndSubmit(screen, 'a'.repeat(64));

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Login Failed',
        'Please check your key and try again',
        LOGIN_TOAST_OPTIONS
      );
      expect(screen.queryByText('Connecting...')).toBeNull();
    });
  });

  it('disables all inputs during loading', async () => {
    const mockLogin = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const screen = renderLoginScreen();
    selectLoginMethod(screen, 'Private key');
    const keyInput = screen.getByPlaceholderText(PRIVATE_KEY_PLACEHOLDER);

    fireEvent.changeText(keyInput, 'a'.repeat(64));
    fireEvent.press(screen.getByText(PRIVATE_KEY_BUTTON));

    await waitFor(() => {
      expect(keyInput.props.editable).toBe(false);
    });
  });
});
