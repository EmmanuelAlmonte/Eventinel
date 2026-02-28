import { NDKWalletStatus, type NDKWalletBalance } from '@nostr-dev-kit/mobile';

export function splitUrls(input: string): string[] {
  return input
    .split(/[\s,]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function shortHex(hex: string, head = 12, tail = 8): string {
  if (!hex) return '';
  if (hex.length <= head + tail + 3) return hex;
  return `${hex.slice(0, head)}...${hex.slice(-tail)}`;
}

export function walletStatusLabel(status: NDKWalletStatus | undefined): string {
  switch (status) {
    case NDKWalletStatus.READY:
      return 'ready';
    case NDKWalletStatus.LOADING:
      return 'loading';
    case NDKWalletStatus.FAILED:
      return 'failed';
    case NDKWalletStatus.INITIAL:
      return 'initial';
    default:
      return 'unknown';
  }
}

export function balanceAmount(balance: NDKWalletBalance | undefined): number {
  return balance?.amount ?? 0;
}
