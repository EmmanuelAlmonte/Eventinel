import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockCreateWallet = jest.fn();
const mockFetchCashuWallet = jest.fn();
const mockResolveCashuCreateRelays = jest.fn();
const mockRunWithCashuBusy = jest.fn();
const mockSyncCashuWalletState = jest.fn();
const mockWalletRelayUrls = jest.fn();
const mockShowToastSuccess = jest.fn();
const mockShowToastError = jest.fn();
const mockShowToastWarning = jest.fn();

jest.mock('@nostr-dev-kit/mobile', () => ({
  NDKCashuWallet: {
    create: (...args: unknown[]) => mockCreateWallet(...args),
  },
  NDKWalletStatus: {
    INITIAL: 'initial',
    LOADING: 'loading',
    READY: 'ready',
    FAILED: 'failed',
  },
}));

jest.mock('@components/ui', () => ({
  showToast: {
    success: (...args: unknown[]) => mockShowToastSuccess(...args),
    error: (...args: unknown[]) => mockShowToastError(...args),
    warning: (...args: unknown[]) => mockShowToastWarning(...args),
  },
}));

jest.mock('@lib/ndk', () => ({
  ndk: {},
}));

jest.mock('../../../screens/wallet/cashuWalletUtils', () => ({
  bindCashuWalletEvents: jest.fn(() => undefined),
  fetchCashuWallet: (...args: unknown[]) => mockFetchCashuWallet(...args),
  formatError: jest.fn((_error: unknown, fallback: string) => fallback),
  getInitialCashuCreateRelays: jest.fn(() => ''),
  getInitialCashuCreateMints: jest.fn(() => ''),
  isValidMintUrl: jest.fn(() => true),
  isValidRelayUrl: jest.fn(() => true),
  parseSatsAmount: jest.fn((rawAmount: string) => {
    const amount = Number.parseInt(rawAmount.trim(), 10);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }),
  resetCashuWalletState: jest.fn(),
  resolveCashuCreateRelays: () => mockResolveCashuCreateRelays(),
  runWithCashuBusy: (...args: unknown[]) => mockRunWithCashuBusy(...args),
  syncCashuWalletState: (...args: unknown[]) => mockSyncCashuWalletState(...args),
  walletRelayUrls: (...args: unknown[]) => mockWalletRelayUrls(...args),
}));

import { useCashuWallet } from '../../../screens/wallet/useCashuWallet';

type MockCashuWallet = {
  mints: string[];
  status: string;
  balance: { amount: number };
  start: jest.Mock<Promise<void>, []>;
  updateBalance: jest.Mock<Promise<void>, []>;
  publishMintList: jest.Mock<Promise<void>, []>;
  update: jest.Mock<Promise<void>, [{ mints: string[]; relays?: string[] }]>;
  send: jest.Mock<Promise<string>, [number, string]>;
  receiveToken: jest.Mock<Promise<void>, [string, string]>;
  deposit: jest.Mock;
};

function createMockWallet(overrides: Partial<MockCashuWallet> = {}): MockCashuWallet {
  return {
    mints: ['https://mint.a'],
    status: 'ready',
    balance: { amount: 21 },
    start: jest.fn().mockResolvedValue(undefined),
    updateBalance: jest.fn().mockResolvedValue(undefined),
    publishMintList: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue('cashuB_token'),
    receiveToken: jest.fn().mockResolvedValue(undefined),
    deposit: jest.fn(),
    ...overrides,
  };
}

describe('useCashuWallet publishMintList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveCashuCreateRelays.mockResolvedValue(['wss://relay.eventinel.com']);
    mockFetchCashuWallet.mockResolvedValue(null);
    mockWalletRelayUrls.mockReturnValue(['wss://relay.eventinel.com']);
    mockRunWithCashuBusy.mockImplementation(
      async (
        setBusy: (busy: boolean) => void,
        action: () => Promise<void>,
        onError: (error: unknown) => void
      ) => {
        setBusy(true);
        try {
          await action();
        } catch (error) {
          onError(error);
        } finally {
          setBusy(false);
        }
      }
    );
    mockSyncCashuWalletState.mockImplementation(
      (
        wallet: MockCashuWallet,
        setWallet: (wallet: MockCashuWallet | null) => void,
        setStatus: (status: string | undefined) => void,
        setBalance: (balance: number) => void
      ) => {
        setWallet(wallet);
        setStatus(wallet.status);
        setBalance(wallet.balance.amount);
      }
    );
  });

  it('calls publishMintList after successful wallet creation', async () => {
    const createdWallet = createMockWallet();
    mockCreateWallet.mockResolvedValue(createdWallet);

    const { result } = renderHook(() => useCashuWallet('a'.repeat(64), true));

    act(() => {
      result.current.setCashuCreateMints('https://mint.a');
    });
    await act(async () => {
      await result.current.handleCreateCashuWallet();
    });

    expect(mockCreateWallet).toHaveBeenCalledWith(
      expect.anything(),
      ['https://mint.a'],
      ['wss://relay.eventinel.com']
    );
    expect(createdWallet.publishMintList).toHaveBeenCalledTimes(1);
    expect(mockShowToastSuccess).toHaveBeenCalledWith('Cashu wallet created');
    expect(mockShowToastError).not.toHaveBeenCalled();
    expect(mockShowToastWarning).not.toHaveBeenCalled();
  });

  it('calls publishMintList after successful wallet update', async () => {
    const existingWallet = createMockWallet({
      mints: ['https://mint.a'],
    });
    mockFetchCashuWallet.mockResolvedValue(existingWallet);

    const { result } = renderHook(() => useCashuWallet('a'.repeat(64), true));

    await waitFor(() => {
      expect(result.current.cashuWallet).toBe(existingWallet);
    });

    act(() => {
      result.current.setCashuEditMints('https://mint.a\nhttps://mint.b');
      result.current.setCashuEditRelays('wss://relay.eventinel.com');
    });
    await act(async () => {
      await result.current.handleCashuUpdateMints();
    });

    expect(existingWallet.update).toHaveBeenCalledWith({
      mints: ['https://mint.a', 'https://mint.b'],
      relays: ['wss://relay.eventinel.com'],
    });
    expect(existingWallet.publishMintList).toHaveBeenCalledTimes(1);
    expect(mockShowToastSuccess).toHaveBeenCalledWith('Wallet settings updated');
    expect(mockShowToastError).not.toHaveBeenCalled();
    expect(mockShowToastWarning).not.toHaveBeenCalled();
  });

  it('keeps wallet creation successful when publishMintList fails', async () => {
    const createdWallet = createMockWallet({
      publishMintList: jest.fn().mockRejectedValue(new Error('publish relay timeout')),
    });
    mockCreateWallet.mockResolvedValue(createdWallet);

    const { result } = renderHook(() => useCashuWallet('a'.repeat(64), true));

    act(() => {
      result.current.setCashuCreateMints('https://mint.a');
    });
    await act(async () => {
      await result.current.handleCreateCashuWallet();
    });

    expect(createdWallet.publishMintList).toHaveBeenCalledTimes(1);
    expect(mockShowToastSuccess).toHaveBeenCalledWith('Cashu wallet created');
    expect(mockShowToastWarning).toHaveBeenCalledWith(
      'Wallet saved, but mint list publish failed',
      expect.stringContaining('NIP-61 recipients may not discover this wallet yet.')
    );
    expect(mockShowToastError).not.toHaveBeenCalled();
  });

  it('keeps wallet update successful when publishMintList fails', async () => {
    const existingWallet = createMockWallet({
      publishMintList: jest.fn().mockRejectedValue(new Error('publish blocked')),
    });
    mockFetchCashuWallet.mockResolvedValue(existingWallet);

    const { result } = renderHook(() => useCashuWallet('a'.repeat(64), true));

    await waitFor(() => {
      expect(result.current.cashuWallet).toBe(existingWallet);
    });

    act(() => {
      result.current.setCashuEditMints('https://mint.a\nhttps://mint.b');
      result.current.setCashuEditRelays('wss://relay.eventinel.com');
    });
    await act(async () => {
      await result.current.handleCashuUpdateMints();
    });

    expect(existingWallet.update).toHaveBeenCalledWith({
      mints: ['https://mint.a', 'https://mint.b'],
      relays: ['wss://relay.eventinel.com'],
    });
    expect(existingWallet.publishMintList).toHaveBeenCalledTimes(1);
    expect(mockShowToastSuccess).toHaveBeenCalledWith('Wallet settings updated');
    expect(mockShowToastWarning).toHaveBeenCalledWith(
      'Wallet saved, but mint list publish failed',
      expect.stringContaining('NIP-61 recipients may not discover this wallet yet.')
    );
    expect(mockShowToastError).not.toHaveBeenCalled();
  });
});
