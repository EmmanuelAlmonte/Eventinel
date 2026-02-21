export function parsePositiveInt(rawValue) {
  const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function deriveActionState(input) {
  const connected = input.connected === true;
  const quoteAmount = parsePositiveInt(input.quoteAmountValue);
  const hasQuoteId = String(input.quoteIdValue ?? '').trim().length > 0;
  const sendAmount = parsePositiveInt(input.sendAmountValue);
  const hasSendToken = String(input.sendTokenValue ?? '').trim().length > 0;
  const hasReceiveToken = String(input.receiveTokenValue ?? '').trim().length > 0;
  const proofCount = Number(input.proofCount ?? 0);
  const balance = Number(input.balance ?? 0);
  const hasProofs = proofCount > 0;
  const sendWithinBalance = sendAmount !== null ? sendAmount <= balance : true;

  const controls = {
    createQuoteDisabled: !connected || quoteAmount === null,
    checkQuoteDisabled: !connected || !hasQuoteId,
    mintQuoteDisabled: !connected || quoteAmount === null || !hasQuoteId,
    sendDisabled: !connected || !hasProofs || sendAmount === null || !sendWithinBalance,
    copyTokenDisabled: !connected || !hasSendToken,
    receiveDisabled: !connected || !hasReceiveToken,
    resetDisabled: !connected || !hasProofs,
  };

  let quoteHint = 'Quote actions ready.';
  if (!connected) {
    quoteHint = 'Connect mint to enable top-up actions.';
  } else if (!hasQuoteId) {
    quoteHint = 'Enter a quote ID to enable Check and Mint Proofs.';
  } else if (quoteAmount === null) {
    quoteHint = 'Enter a positive amount to create or mint quote.';
  }

  let sendHint = 'Send action ready.';
  if (!connected) {
    sendHint = 'Connect mint to enable send and receive actions.';
  } else if (!hasProofs) {
    sendHint = 'No proofs available. Top up wallet before sending.';
  } else if (sendAmount === null) {
    sendHint = 'Enter a positive send amount.';
  } else if (!sendWithinBalance) {
    sendHint = `Send amount exceeds balance (${balance} sats).`;
  }

  return {
    controls,
    hints: {
      quoteHint,
      sendHint,
    },
  };
}
