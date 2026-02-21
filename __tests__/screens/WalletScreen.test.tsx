import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import WalletScreen from '../../screens/WalletScreen';

const mockCopyToClipboard = jest.fn();
const mockHandleCashuSendToken = jest.fn();
const mockUseCashuWallet = jest.fn();
const mockUseNwcWallet = jest.fn();

let lastCashuSectionProps: Record<string, unknown> | null = null;

jest.mock('@hooks', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#111111',
      textMuted: '#666666',
      background: '#ffffff',
      surface: '#f3f4f6',
      border: '#d1d5db',
      borderMuted: '#d1d5db',
      primary: '#2563eb',
    },
  }),
}));

jest.mock('@nostr-dev-kit/mobile', () => {
  const original = jest.requireActual('../../__mocks__/@nostr-dev-kit/mobile');
  return {
    __esModule: true,
    ...original,
    default: original.default ?? original,
    useNDKCurrentUser: () => ({ pubkey: 'test-pubkey' }),
  };
});

jest.mock('@lib/featureFlags', () => ({
  isCashuWalletFeatureEnabled: true,
  isLightningWalletFeatureEnabled: true,
}));

jest.mock('../../screens/wallet/useCashuWallet', () => ({
  useCashuWallet: (...args: unknown[]) => mockUseCashuWallet(...args),
}));

jest.mock('../../screens/wallet/useNwcWallet', () => ({
  useNwcWallet: (...args: unknown[]) => mockUseNwcWallet(...args),
}));

jest.mock('../../screens/wallet/WalletSections', () => {
  const ReactLocal = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    NwcSection: () => (
      <View>
        <Text>NWC Section</Text>
      </View>
    ),
    CashuSection: (props: Record<string, unknown>) => {
      lastCashuSectionProps = props;
      return (
        <View>
          <Text>Cashu Section</Text>
          <Pressable testID="cashu-send-token" onPress={() => (props.onSendToken as any)()}>
            <Text>Send</Text>
          </Pressable>
          <Pressable
            testID="cashu-copy-send-token"
            onPress={() => (props.onCopySendToken as any)('cashuB_test_token')}
          >
            <Text>Copy</Text>
          </Pressable>
        </View>
      );
    },
  };
});

jest.mock('@components/ui', () => {
  const { View } = require('react-native');
  return {
    ScreenContainer: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('WalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastCashuSectionProps = null;

    mockUseNwcWallet.mockReturnValue({
      nwcWallet: null,
      nwcInfo: null,
      nwcStatus: undefined,
      nwcBalance: 0,
      nwcBusy: false,
      nwcPairingCodeInput: '',
      setNwcPairingCodeInput: jest.fn(),
      nwcPayInvoice: '',
      setNwcPayInvoice: jest.fn(),
      nwcMakeAmount: '',
      setNwcMakeAmount: jest.fn(),
      nwcMakeDesc: '',
      setNwcMakeDesc: jest.fn(),
      nwcCreatedInvoice: null,
      nwcConnectionSummary: null,
      connectNwc: jest.fn(),
      disconnectNwc: jest.fn(),
      handleNwcPay: jest.fn(),
      handleNwcMakeInvoice: jest.fn(),
      copyToClipboard: mockCopyToClipboard,
    });

    mockUseCashuWallet.mockReturnValue({
      cashuWallet: { mints: ['http://10.0.2.2:3338'] },
      cashuStatus: undefined,
      cashuBalance: 12,
      cashuBusy: false,
      cashuCreateMints: 'http://10.0.2.2:3338',
      setCashuCreateMints: jest.fn(),
      cashuCreateRelays: 'wss://relay.eventinel.com',
      setCashuCreateRelays: jest.fn(),
      cashuDepositAmount: '',
      setCashuDepositAmount: jest.fn(),
      cashuDepositInvoice: null,
      cashuSendAmount: '5',
      setCashuSendAmount: jest.fn(),
      cashuSendToken: 'cashuB1_example',
      cashuReceiveToken: '',
      setCashuReceiveToken: jest.fn(),
      refreshCashuWallet: jest.fn(),
      handleCreateCashuWallet: jest.fn(),
      handleCashuDeposit: jest.fn(),
      handleCashuSendToken: mockHandleCashuSendToken,
      handleCashuReceiveToken: jest.fn(),
    });
  });

  it('passes Cashu send/export props and wires send handler', () => {
    const { getByTestId } = render(<WalletScreen />);

    expect(lastCashuSectionProps).toBeTruthy();
    expect(lastCashuSectionProps?.sendAmount).toBe('5');
    expect(lastCashuSectionProps?.sendToken).toBe('cashuB1_example');

    fireEvent.press(getByTestId('cashu-send-token'));
    expect(mockHandleCashuSendToken).toHaveBeenCalledTimes(1);
  });

  it('wires copy affordance for exported Cashu token', () => {
    const { getByTestId } = render(<WalletScreen />);

    fireEvent.press(getByTestId('cashu-copy-send-token'));
    expect(mockCopyToClipboard).toHaveBeenCalledWith('cashuB_test_token', 'Token');
  });
});
