/**
 * Shared harness for LoginScreen behavior tests.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockColors = {
  background: '#1a1a2e',
  surface: '#27272A',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  border: '#3F3F46',
};

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: mockColors,
    isDark: true,
  }),
}));

jest.mock('@components/ui', () => {
  const React = require('react');
  const { View } = require('react-native');
  const showToast = {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    network: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
  };

  return {
    ScreenContainer: ({ children }: any) =>
      React.createElement(View, null, children),
    showToast,
  };
});

import LoginScreen from '../../screens/LoginScreen';
import {
  mockNDKHooks,
  useNDK,
  useNip55,
  useNDKSessionLogin,
} from '../../__mocks__/@nostr-dev-kit/mobile';

export const LOGIN_TOAST_OPTIONS = { visibilityTime: 12000 };

export const REMOTE_SIGNER_PLACEHOLDER =
  'bunker://pubkey?relay=wss://... or name@domain';
export const RELAY_PLACEHOLDER = 'wss://relay.example.com';
export const PRIVATE_KEY_PLACEHOLDER = 'nsec1... or hex private key';

export const REMOTE_SIGNER_BUTTON = 'Connect signer';
export const NOSTR_CONNECT_BUTTON = 'Generate Nostr Connect';
export const PRIVATE_KEY_BUTTON = 'Continue with private key';

export const mockShowToast = jest.requireMock('@components/ui').showToast as {
  error: jest.Mock;
  warning: jest.Mock;
  success: jest.Mock;
  info: jest.Mock;
  network: jest.Mock;
  show: jest.Mock;
  hide: jest.Mock;
};

export { mockNDKHooks, useNDK, useNip55, useNDKSessionLogin };

export const resetLoginScreenMocks = () => {
  mockNDKHooks.reset();
  jest.clearAllMocks();
  useNDK.mockImplementation(() => ({ ndk: mockNDKHooks.getNDK() }));
};

export const renderLoginScreen = () => render(<LoginScreen />);

export const selectLoginMethod = (
  screen: ReturnType<typeof renderLoginScreen>,
  label: 'Signer app' | 'Nostr Connect' | 'Private key'
) => {
  fireEvent.press(screen.getAllByText(label)[0]);
};

export const setAndroidSignerAvailable = (
  apps = [{ packageName: 'com.greenart7c3.nostrsigner', name: 'Amber' }]
) => {
  Platform.OS = 'android';
  mockNDKHooks.setNip55Available(true);
  mockNDKHooks.setNip55Apps(apps);
};

export const setIOSWithoutSigner = () => {
  Platform.OS = 'ios';
  mockNDKHooks.setNip55Available(false);
  mockNDKHooks.setNip55Apps([]);
};

export const enterRemoteSignerAndSubmit = (
  screen: ReturnType<typeof renderLoginScreen>,
  value: string
) => {
  fireEvent.changeText(screen.getByPlaceholderText(REMOTE_SIGNER_PLACEHOLDER), value);
  fireEvent.press(screen.getByText(REMOTE_SIGNER_BUTTON));
};

export const enterRelayAndGenerate = (
  screen: ReturnType<typeof renderLoginScreen>,
  value: string
) => {
  selectLoginMethod(screen, 'Nostr Connect');
  fireEvent.changeText(screen.getByPlaceholderText(RELAY_PLACEHOLDER), value);
  fireEvent.press(screen.getByText(NOSTR_CONNECT_BUTTON));
};

export const enterPrivateKeyAndSubmit = (
  screen: ReturnType<typeof renderLoginScreen>,
  value: string
) => {
  selectLoginMethod(screen, 'Private key');
  fireEvent.changeText(screen.getByPlaceholderText(PRIVATE_KEY_PLACEHOLDER), value);
  fireEvent.press(screen.getByText(PRIVATE_KEY_BUTTON));
};
