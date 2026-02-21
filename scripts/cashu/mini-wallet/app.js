import { request } from './apiClient.js';
import { createActivityFeed } from './activityFeed.js';
import { createFeedbackBanner } from './feedbackBanner.js';
import { deriveConnectionState, renderConnectionStatus } from './connectionStatus.js';
import { createStageController } from './stageController.js';
import { createWalletOperations } from './walletOperations.js';
import { createConfirmDialogController } from './confirmDialogController.js';

const $ = (id) => document.getElementById(id);

const mintUrlInput = $('mintUrl');
const balanceEl = $('balance');
const proofCountEl = $('proofCount');
const mintInfoEl = $('mintInfo');
const activityEl = $('activity');
const connectionStatusEl = $('connectionStatus');
const connectionLabelEl = $('connectionLabel');
const connectionMetaEl = $('connectionMeta');
const feedbackBannerEl = $('feedbackBanner');
const stageTopUpEl = $('stageTopUp');
const topUpStatusEl = $('topUpStatus');
const topUpLockedHintEl = $('topUpLockedHint');
const topUpBodyEl = $('topUpBody');
const stageTransferEl = $('stageTransfer');
const transferStatusEl = $('transferStatus');
const transferLockedHintEl = $('transferLockedHint');
const transferBodyEl = $('transferBody');
const createQuoteBtn = $('createQuoteBtn');
const checkQuoteBtn = $('checkQuoteBtn');
const mintQuoteBtn = $('mintQuoteBtn');
const sendBtn = $('sendBtn');
const copyTokenBtn = $('copyTokenBtn');
const receiveBtn = $('receiveBtn');
const resetBtn = $('resetBtn');
const quoteActionHintEl = $('quoteActionHint');
const sendActionHintEl = $('sendActionHint');
const quoteAmountInput = $('quoteAmount');
const quoteIdInput = $('quoteId');
const quoteInvoiceInput = $('quoteInvoice');
const sendAmountInput = $('sendAmount');
const sendTokenInput = $('sendToken');
const receiveTokenInput = $('receiveToken');
const resetModalEl = $('resetModal');
const resetCancelBtn = $('resetCancelBtn');
const resetConfirmBtn = $('resetConfirmBtn');

const state = {
  mintUrl: '',
  connectionOnline: null,
  balance: 0,
  proofCount: 0,
};

const feedbackBanner = createFeedbackBanner(feedbackBannerEl);
const activityFeed = createActivityFeed(activityEl, feedbackBanner.showFeedback);
const stageController = createStageController({
  createQuoteBtn,
  checkQuoteBtn,
  mintQuoteBtn,
  sendBtn,
  copyTokenBtn,
  receiveBtn,
  resetBtn,
  quoteActionHintEl,
  sendActionHintEl,
  stageTopUpEl,
  topUpBodyEl,
  topUpLockedHintEl,
  topUpStatusEl,
  stageTransferEl,
  transferBodyEl,
  transferLockedHintEl,
  transferStatusEl,
});

function setResetModalOpen(isOpen) {
  resetModalEl.hidden = !isOpen;
  document.body.classList.toggle('modal-open', isOpen);
}

const resetDialog = createConfirmDialogController(setResetModalOpen);
const appendActivity = activityFeed.appendActivity;

const refs = {
  mintUrlInput,
  quoteAmountInput,
  quoteIdInput,
  quoteInvoiceInput,
  sendAmountInput,
  sendTokenInput,
  receiveTokenInput,
  mintInfoEl,
};

function clearWorkflowFields(options = {}) {
  const { clearQuote = false, clearTransfer = false } = options;
  if (clearQuote) {
    quoteIdInput.value = '';
    quoteInvoiceInput.value = '';
  }
  if (clearTransfer) {
    sendAmountInput.value = '';
    sendTokenInput.value = '';
    receiveTokenInput.value = '';
  }
}

function renderSummary(summary) {
  state.mintUrl = summary.mintUrl || state.mintUrl;
  state.balance = summary.balance ?? 0;
  state.proofCount = summary.proofCount ?? 0;
  mintUrlInput.value = state.mintUrl;
  balanceEl.textContent = String(state.balance);
  proofCountEl.textContent = String(state.proofCount);
  if (state.proofCount === 0) {
    sendTokenInput.value = '';
  }
}

function requestResetConfirmation() {
  const pending = resetDialog.request();
  resetCancelBtn.focus();
  return pending;
}

function updateActionStates() {
  stageController.updateActionStates({
    connected: state.connectionOnline,
    quoteAmountValue: quoteAmountInput.value,
    quoteIdValue: quoteIdInput.value,
    sendAmountValue: sendAmountInput.value,
    sendTokenValue: sendTokenInput.value,
    receiveTokenValue: receiveTokenInput.value,
    balance: state.balance,
    proofCount: state.proofCount,
  });
}

const operations = createWalletOperations({
  request,
  state,
  refs,
  appendActivity,
  showFeedback: feedbackBanner.showFeedback,
  requestResetConfirmation,
  updateActionStates,
  clearWorkflowFields,
  renderSummary,
});

function completeResetConfirmation(confirmed) {
  return resetDialog.resolve(confirmed);
}

async function refreshConnectionStatus() {
  const previousConnection = state.connectionOnline;
  const connection = await request('/api/connection-status');
  const connectionOnline = deriveConnectionState(connection);
  state.connectionOnline = connectionOnline;

  renderConnectionStatus(connectionStatusEl, connectionLabelEl, connectionMetaEl, connection);
  stageController.syncStageStates(connectionOnline === true);
  updateActionStates();

  if (previousConnection !== state.connectionOnline) {
    if (state.connectionOnline === true) {
      appendActivity('Mint connection is online', { latencyMs: connection.latencyMs, mintName: connection.mintName }, 'success');
    } else if (state.connectionOnline === false) {
      appendActivity('Mint connection is offline', { error: connection.error }, 'warning');
    }
  }
}

async function refreshAll() {
  await operations.refreshState();
  await operations.refreshMintInfo();
  await refreshConnectionStatus();
}

async function run(task) {
  try {
    await task();
    await refreshConnectionStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendActivity(`Error: ${message}`, null, 'error');
    feedbackBanner.showFeedback('error', 'Action failed', message);
  }
}

function getClipboardErrorDetail(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const fallback = String(error ?? '').trim();
  return fallback || 'Unknown clipboard error';
}

function mapClipboardErrorToUserMessage(error) {
  const name = typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
  const detail = getClipboardErrorDetail(error).toLowerCase();
  if (name === 'NotAllowedError') {
    return 'Clipboard permission denied. Allow clipboard access and try again.';
  }
  if (name === 'SecurityError') {
    return 'Clipboard requires a secure context (HTTPS or localhost).';
  }
  if (name === 'TypeError' || detail.includes('writetext') || detail.includes('undefined')) {
    return 'Clipboard not supported in this browser/context. Please copy manually.';
  }
  return 'Could not copy token. Please copy manually.';
}

function setupActions() {
  const { connectMint, createQuote, checkQuote, mintProofs, sendToken, receiveToken, resetProofs } = operations;
  $('saveMintBtn').addEventListener('click', () => run(connectMint));
  $('refreshStateBtn').addEventListener('click', () => run(refreshAll));
  createQuoteBtn.addEventListener('click', () => run(createQuote));
  checkQuoteBtn.addEventListener('click', () => run(checkQuote));
  mintQuoteBtn.addEventListener('click', () => run(mintProofs));
  sendBtn.addEventListener('click', () => run(sendToken));
  receiveBtn.addEventListener('click', () => run(receiveToken));
  resetBtn.addEventListener('click', () => run(resetProofs));
  copyTokenBtn.addEventListener('click', async () => {
    const token = sendTokenInput.value;
    if (!token) return;
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      appendActivity('Copy token failed', { reason: 'Clipboard API unavailable' }, 'error');
      feedbackBanner.showFeedback('error', 'Copy failed', 'Clipboard not supported in this browser/context. Please copy manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      appendActivity('Copied token to clipboard', null, 'info');
      feedbackBanner.showFeedback('info', 'Copied token', 'Token copied to clipboard.');
    } catch (error) {
      const detail = getClipboardErrorDetail(error);
      const userMessage = mapClipboardErrorToUserMessage(error);
      appendActivity('Copy token failed', { reason: detail }, 'error');
      feedbackBanner.showFeedback('error', 'Copy failed', userMessage);
    }
  });
  resetCancelBtn.addEventListener('click', () => completeResetConfirmation(false));
  resetConfirmBtn.addEventListener('click', () => completeResetConfirmation(true));
  resetModalEl.addEventListener('click', (event) => {
    if (event.target === resetModalEl) {
      completeResetConfirmation(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      completeResetConfirmation(false);
    }
  });
  [quoteAmountInput, quoteIdInput, sendAmountInput, sendTokenInput, receiveTokenInput].forEach((input) => {
    input.addEventListener('input', () => {
      updateActionStates();
    });
  });
}

setupActions();
stageController.syncStageStates(state.connectionOnline === true);
updateActionStates();
run(refreshAll);
setInterval(() => {
  refreshConnectionStatus().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    state.connectionOnline = false;
    renderConnectionStatus(connectionStatusEl, connectionLabelEl, connectionMetaEl, {
      connected: false,
      error: message,
    });
    stageController.syncStageStates(false);
    updateActionStates();
  });
}, 8000);
