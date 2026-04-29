/**
 * LoginScreen NIP-55 Android signer behavior.
 *
 * @jest-environment jsdom
 */

import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  LOGIN_TOAST_OPTIONS,
  mockNDKHooks,
  mockShowToast,
  renderLoginScreen,
  resetLoginScreenMocks,
  setAndroidSignerAvailable,
  useNDKSessionLogin,
} from './loginScreenTestHarness';

describe('LoginScreen NIP-55 login', () => {
  beforeEach(() => {
    resetLoginScreenMocks();
    setAndroidSignerAvailable();
  });

  it('calls login when NIP-55 button is pressed', async () => {
    const mockLogin = jest.fn().mockResolvedValue({});
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const { getByText } = renderLoginScreen();

    fireEvent.press(getByText('Amber'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows loading state during NIP-55 login', async () => {
    const mockLogin = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const { getByText, queryByText } = renderLoginScreen();

    fireEvent.press(getByText('Amber'));

    await waitFor(() => {
      expect(queryByText('Connecting...')).toBeTruthy();
    });
  });

  it('displays error when NIP-55 login fails', async () => {
    const mockLogin = jest
      .fn()
      .mockRejectedValue(new Error('Signer unavailable'));
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const { getByText } = renderLoginScreen();

    fireEvent.press(getByText('Amber'));

    await waitFor(() => {
      expect(mockShowToast.error).toHaveBeenCalledWith(
        'Login Failed',
        'Signer unavailable',
        LOGIN_TOAST_OPTIONS
      );
    });
  });

  it('disables buttons during loading', async () => {
    const mockLogin = jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    (useNDKSessionLogin as jest.Mock).mockReturnValue(mockLogin);

    const { getByText, queryByText } = renderLoginScreen();
    const loginButton = getByText('Amber');

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(queryByText('Connecting...')).toBeTruthy();
    });
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(loginButton);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('renders multiple signer apps when available', () => {
    mockNDKHooks.setNip55Apps([
      { packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' },
      { packageName: 'com.example.signer', name: 'Another Signer' },
    ]);

    const { getByText } = renderLoginScreen();

    expect(getByText('Amber')).toBeTruthy();
    expect(getByText('Another Signer')).toBeTruthy();
  });
});
