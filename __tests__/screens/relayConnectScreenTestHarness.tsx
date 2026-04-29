/**
 * Shared test harness for RelayConnectScreen behavior suites.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../lib/ndk', () => {
  const relaysMap = new Map();
  return {
    ndk: {
      pool: {
        get relays() {
          return relaysMap;
        },
        on: jest.fn(),
        off: jest.fn(),
        removeRelay: jest.fn(),
      },
      connect: jest.fn().mockResolvedValue(undefined),
      addExplicitRelay: jest.fn().mockImplementation((url: string) => ({
        url,
        status: 4,
        connect: jest.fn(),
      })),
    },
    __mockRelaysMap: relaysMap,
  };
});

jest.mock('../../lib/relay/status', () => ({
  isConnected: (status: number) => status >= 5,
  isConnecting: (status: number) => status === 4,
  sortRelays: (relays: any[]) =>
    [...relays].sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      return a.url.localeCompare(b.url);
    }),
  getStatusString: (status: number) => {
    if (status >= 5) return 'connected';
    if (status === 4) return 'connecting';
    return 'disconnected';
  },
}));

jest.mock('../../lib/relay/storage', () => {
  const addRelayToStorage = jest.fn().mockResolvedValue(undefined);
  const removeRelayFromStorage = jest.fn().mockResolvedValue(undefined);

  return {
    addRelayToStorage,
    removeRelayFromStorage,
    saveRelays: jest.fn().mockResolvedValue(undefined),
    DEFAULT_RELAYS: ['wss://relay.eventinel.com'],
    LOCAL_RELAYS: ['ws://10.0.2.2:8085'],
  };
});

const mockColors = {
  background: '#1a1a2e',
  surface: '#27272A',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  primary: '#2563eb',
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

jest.mock('@components/ui', () => ({
  ScreenContainer: ({ children, scroll }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    if (scroll) {
      return React.createElement(
        ReactNative.ScrollView,
        { testID: 'screen-container-scroll' },
        children
      );
    }
    return React.createElement(
      ReactNative.View,
      { testID: 'screen-container' },
      children
    );
  },
}));

jest.mock('@nostr-dev-kit/mobile', () => ({
  NDKRelayStatus: {
    DISCONNECTED: 1,
    CONNECTING: 4,
    CONNECTED: 5,
    AUTHENTICATED: 8,
  },
}));

jest.mock('@rneui/themed', () => ({
  Text: ({ children, style, h2, numberOfLines, ellipsizeMode, ...props }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    return React.createElement(
      ReactNative.Text,
      { style, numberOfLines, ...props },
      children
    );
  },
  Card: ({ children, containerStyle }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    return React.createElement(
      ReactNative.View,
      { style: containerStyle, testID: 'card' },
      children
    );
  },
  Icon: ({ name, onPress }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    if (onPress) {
      return React.createElement(
        ReactNative.Pressable,
        { testID: `icon-button-${name}`, onPress },
        React.createElement(ReactNative.Text, null, name)
      );
    }
    return React.createElement(
      ReactNative.View,
      { testID: `icon-${name}` },
      React.createElement(ReactNative.Text, null, name)
    );
  },
  Button: ({ title, onPress, containerStyle, icon }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    return React.createElement(
      ReactNative.Pressable,
      {
        testID: `button-${title?.toLowerCase().replace(/\s+/g, '-')}`,
        onPress,
        style: containerStyle,
      },
      icon ? React.createElement(ReactNative.View, null, icon) : null,
      React.createElement(ReactNative.Text, null, title)
    );
  },
  Input: ({
    placeholder,
    value,
    onChangeText,
    autoCapitalize,
    autoCorrect,
    leftIcon,
    containerStyle,
    inputContainerStyle,
    inputStyle,
    placeholderTextColor,
  }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    return React.createElement(
      ReactNative.View,
      { style: containerStyle },
      leftIcon,
      React.createElement(ReactNative.TextInput, {
        testID: 'relay-url-input',
        placeholder,
        value,
        onChangeText,
        autoCapitalize,
        autoCorrect,
        style: [inputContainerStyle, inputStyle],
        placeholderTextColor,
      })
    );
  },
  Switch: ({ value, onValueChange, disabled }: any) => {
    const React = require('react');
    const ReactNative = require('react-native');
    return React.createElement(
      ReactNative.Pressable,
      {
        accessibilityRole: 'switch',
        accessibilityState: { checked: value, disabled },
        onPress: () => {
          if (!disabled && onValueChange) onValueChange(!value);
        },
      },
      React.createElement(ReactNative.Text, null, value ? 'On' : 'Off')
    );
  },
}));

import RelayConnectScreen from '../../screens/RelayConnectScreen';
import { ndk } from '../../lib/ndk';

export const mockAddExplicitRelay = ndk.addExplicitRelay;
export const mockRemoveRelay = ndk.pool.removeRelay;
export const mockOn = ndk.pool.on;
export const mockOff = ndk.pool.off;

const ndkMock = jest.requireMock('../../lib/ndk');

const relayStorageMock = jest.requireMock('../../lib/relay/storage');

export const __mockRelaysMap = ndkMock.__mockRelaysMap;
export const mockAddRelayToStorage = relayStorageMock.addRelayToStorage;
export const mockRemoveRelayFromStorage = relayStorageMock.removeRelayFromStorage;

export function setupRelayConnectScreenTest() {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  seedDefaultRelays();
}

export function cleanupRelayConnectScreenTest() {
  jest.restoreAllMocks();
}

export function seedDefaultRelays() {
  __mockRelaysMap.clear();
  __mockRelaysMap.set('wss://relay1.com', {
    url: 'wss://relay1.com',
    status: 5,
  });
  __mockRelaysMap.set('wss://relay2.com', {
    url: 'wss://relay2.com',
    status: 4,
  });
}

export function clearRelays() {
  __mockRelaysMap.clear();
}

export function renderRelayConnectScreen() {
  return render(<RelayConnectScreen />);
}
