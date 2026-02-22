import { NDKCashuWallet } from '@nostr-dev-kit/mobile';

import { showToast } from '@components/ui';

import { formatError } from './cashuWalletUtils';

type CashuTxStatus = 'start' | 'success' | 'error';

type PublishMintListContext = 'create' | 'update';

export function logCashuDebug(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (details) {
    console.log(`[Wallet][CashuDebug] ${message}`, details);
    return;
  }
  console.log(`[Wallet][CashuDebug] ${message}`);
}

export function logCashuTx(
  action: string,
  status: CashuTxStatus,
  details?: Record<string, unknown>
) {
  logCashuDebug(`tx:${action}:${status}`, details);
}

export function tokenMeta(token: string) {
  const trimmed = token.trim();
  return {
    tokenLength: trimmed.length,
  };
}

export async function publishMintListBestEffort(
  wallet: Pick<NDKCashuWallet, 'publishMintList'>,
  context: PublishMintListContext
) {
  logCashuTx('publish_mint_list', 'start', { context });
  try {
    await wallet.publishMintList();
    logCashuTx('publish_mint_list', 'success', { context });
  } catch (error) {
    const detail = formatError(error, 'Unknown error');
    console.warn(`[Wallet] Cashu mint-list publish failed (${context}):`, error);
    logCashuTx('publish_mint_list', 'error', { context, detail });
    showToast.warning(
      'Wallet saved, but mint list publish failed',
      `NIP-61 recipients may not discover this wallet yet. ${detail}`
    );
  }
}
