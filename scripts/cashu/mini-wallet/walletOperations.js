export function createWalletOperations({
  request,
  state,
  refs,
  appendActivity,
  showFeedback,
  requestResetConfirmation,
  updateActionStates,
  clearWorkflowFields,
  renderSummary,
}) {
  const {
    mintUrlInput,
    quoteAmountInput,
    quoteIdInput,
    quoteInvoiceInput,
    sendAmountInput,
    sendTokenInput,
    receiveTokenInput,
    mintInfoEl,
  } = refs;

  const defaultRenderSummary = ({ mintUrl, balance, proofCount }) => {
    state.mintUrl = mintUrl || state.mintUrl;
    state.balance = balance ?? 0;
    state.proofCount = proofCount ?? 0;
    mintUrlInput.value = state.mintUrl;
    return {
      balance: state.balance,
      proofCount: state.proofCount,
      mintUrl: state.mintUrl,
    };
  };

  const updateSummaryUi = (summary) => {
    const values = renderSummary
      ? renderSummary(summary)
      : defaultRenderSummary(summary);
    if (state.proofCount === 0) {
      sendTokenInput.value = '';
    }
    return values;
  };

  async function refreshState() {
    const summary = await request('/api/state');
    updateSummaryUi(summary);
    updateActionStates();
  }

  async function refreshMintInfo() {
    const result = await request('/api/mint-info');
    mintInfoEl.textContent = JSON.stringify(result.mintInfo, null, 2);
  }

  async function connectMint() {
    const mintUrl = mintUrlInput.value.trim();
    const result = await request('/api/mint-url', {
      method: 'POST',
      body: JSON.stringify({ mintUrl }),
    });
    updateSummaryUi(result);
    clearWorkflowFields({ clearQuote: true, clearTransfer: true });
    mintInfoEl.textContent = JSON.stringify(result.mintInfo, null, 2);
    appendActivity(`Connected mint ${mintUrl}`, null, 'success');
    showFeedback('success', 'Mint connected', mintUrl);
    updateActionStates();
  }

  async function createQuote() {
    const amount = Number.parseInt(quoteAmountInput.value.trim(), 10);
    const result = await request('/api/create-quote', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    quoteIdInput.value = result.quote.quote;
    quoteInvoiceInput.value = result.quote.request || '';
    appendActivity('Created mint quote', result.quote, 'success');
    showFeedback('success', 'Quote created', `Quote ID: ${result.quote.quote}`);
    updateActionStates();
  }

  async function checkQuote() {
    const quote = quoteIdInput.value.trim();
    const result = await request('/api/check-quote', {
      method: 'POST',
      body: JSON.stringify({ quote }),
    });
    quoteInvoiceInput.value = result.quote.request || quoteInvoiceInput.value;
    appendActivity('Checked quote', result.quote, result.quote.state === 'PAID' ? 'success' : 'info');
    showFeedback('info', 'Quote checked', `State: ${result.quote.state || 'Unknown'}`);
    updateActionStates();
  }

  async function mintProofs() {
    const amount = Number.parseInt(quoteAmountInput.value.trim(), 10);
    const quote = quoteIdInput.value.trim();
    const result = await request('/api/mint-proofs', {
      method: 'POST',
      body: JSON.stringify({ amount, quote }),
    });
    updateSummaryUi(result);
    appendActivity('Minted proofs', result, 'success');
    showFeedback('success', 'Proofs minted', `Balance: ${result.balance ?? state.balance} sats`);
    updateActionStates();
  }

  async function sendToken() {
    const amount = Number.parseInt(sendAmountInput.value.trim(), 10);
    const result = await request('/api/send', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    sendTokenInput.value = result.token;
    updateSummaryUi(result);
    appendActivity(`Created token for ${amount} sats`, {
      sentProofCount: result.sentProofCount,
      remainingBalance: result.balance,
    }, 'success');
    showFeedback('success', 'Token created', `${amount} sats ready to share`);
    updateActionStates();
  }

  async function receiveToken() {
    const token = receiveTokenInput.value.trim();
    const result = await request('/api/receive', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    receiveTokenInput.value = '';
    updateSummaryUi(result);
    appendActivity('Received token', {
      receivedProofCount: result.receivedProofCount,
      newBalance: result.balance,
    }, 'success');
    showFeedback('success', 'Token received', `Balance: ${result.balance} sats`);
    updateActionStates();
  }

  async function resetProofs() {
    const ok = await requestResetConfirmation();
    if (!ok) return;
    const result = await request('/api/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
    updateSummaryUi(result);
    clearWorkflowFields({ clearQuote: true, clearTransfer: true });
    appendActivity('Reset wallet proofs', null, 'warning');
    showFeedback('info', 'Wallet proofs reset', 'All local proofs were removed.');
    updateActionStates();
  }

  return {
    refreshState,
    refreshMintInfo,
    connectMint,
    createQuote,
    checkQuote,
    mintProofs,
    sendToken,
    receiveToken,
    resetProofs,
    updateSummaryUi,
  };
}
