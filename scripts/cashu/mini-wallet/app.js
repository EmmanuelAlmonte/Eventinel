import { deriveActionState } from './actionState.js';
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

const MAX_ACTIVITY_ITEMS = 40;
const PAYLOAD_PREVIEW_LIMIT = 280;

const state = {
  mintUrl: '',
  connectionOnline: null,
  balance: 0,
  proofCount: 0,
  feedbackTimer: null,
  activityItems: [],
};

let activityCounter = 0;

function payloadToText(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
}

function createPayloadBlock(payloadText) {
  const payloadEl = document.createElement('div');
  payloadEl.className = 'activity-payload';

  const pre = document.createElement('pre');
  payloadEl.append(pre);

  const collapsible = payloadText.length > PAYLOAD_PREVIEW_LIMIT;
  let expanded = !collapsible;

  const render = () => {
    pre.textContent = expanded ? payloadText : `${payloadText.slice(0, PAYLOAD_PREVIEW_LIMIT)}...`;
  };

  render();

  const actions = document.createElement('div');
  actions.className = 'activity-actions';

  if (collapsible) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'secondary';
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'Show full';
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      toggleBtn.textContent = expanded ? 'Show less' : 'Show full';
      render();
    });
    actions.append(toggleBtn);
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'secondary';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy payload';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payloadText);
      showFeedback('info', 'Copied payload', 'Activity payload copied to clipboard.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showFeedback('error', 'Copy failed', message);
    }
  });
  actions.append(copyBtn);

  payloadEl.append(actions);
  return payloadEl;
}

function renderActivity() {
  activityEl.replaceChildren();

  if (state.activityItems.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.className = 'activity-empty';
    emptyEl.textContent = 'No activity yet.';
    activityEl.append(emptyEl);
    return;
  }

  for (const item of state.activityItems) {
    const itemEl = document.createElement('article');
    itemEl.className = `activity-item activity-${item.level}`;

    const headEl = document.createElement('div');
    headEl.className = 'activity-head';

    const textWrapEl = document.createElement('div');

    const timeEl = document.createElement('div');
    timeEl.className = 'activity-time';
    timeEl.textContent = item.timeLabel;
    textWrapEl.append(timeEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'activity-title';
    titleEl.textContent = item.title;
    textWrapEl.append(titleEl);

    const levelEl = document.createElement('span');
    levelEl.className = 'activity-level';
    levelEl.textContent = item.level;

    headEl.append(textWrapEl, levelEl);
    itemEl.append(headEl);

    if (item.payloadText) {
      itemEl.append(createPayloadBlock(item.payloadText));
    }

    activityEl.append(itemEl);
  }
}

function appendActivity(title, payload, level = 'info') {
  state.activityItems.unshift({
    id: activityCounter += 1,
    title,
    level,
    payloadText: payloadToText(payload),
    timeLabel: new Date().toLocaleTimeString(),
  });

  if (state.activityItems.length > MAX_ACTIVITY_ITEMS) {
    state.activityItems = state.activityItems.slice(0, MAX_ACTIVITY_ITEMS);
  }

  renderActivity();
}

function showFeedback(level, title, detail = '') {
  feedbackBannerEl.className = `feedback-banner feedback-${level}`;
  feedbackBannerEl.hidden = false;
  feedbackBannerEl.replaceChildren();

  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  feedbackBannerEl.append(titleEl);

  if (detail) {
    const detailEl = document.createElement('span');
    detailEl.textContent = detail;
    feedbackBannerEl.append(detailEl);
  }

  if (state.feedbackTimer) {
    clearTimeout(state.feedbackTimer);
  }

  state.feedbackTimer = window.setTimeout(() => {
    feedbackBannerEl.hidden = true;
  }, 5200);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function setResetModalOpen(isOpen) {
  resetModalEl.hidden = !isOpen;
  document.body.classList.toggle('modal-open', isOpen);
}

const resetDialog = createConfirmDialogController(setResetModalOpen);

function completeResetConfirmation(confirmed) {
  return resetDialog.resolve(confirmed);
}

function requestResetConfirmation() {
  const pending = resetDialog.request();
  resetCancelBtn.focus();
  return pending;
}

function updateActionStates() {
  const view = deriveActionState({
    connected: state.connectionOnline,
    quoteAmountValue: quoteAmountInput.value,
    quoteIdValue: quoteIdInput.value,
    sendAmountValue: sendAmountInput.value,
    sendTokenValue: sendTokenInput.value,
    receiveTokenValue: receiveTokenInput.value,
    balance: state.balance,
    proofCount: state.proofCount,
  });

  createQuoteBtn.disabled = view.controls.createQuoteDisabled;
  checkQuoteBtn.disabled = view.controls.checkQuoteDisabled;
  mintQuoteBtn.disabled = view.controls.mintQuoteDisabled;
  sendBtn.disabled = view.controls.sendDisabled;
  copyTokenBtn.disabled = view.controls.copyTokenDisabled;
  receiveBtn.disabled = view.controls.receiveDisabled;
  resetBtn.disabled = view.controls.resetDisabled;
  quoteActionHintEl.textContent = view.hints.quoteHint;
  sendActionHintEl.textContent = view.hints.sendHint;
}

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

function renderConnectionStatus(connection) {
  connectionStatusEl.classList.remove('status-online', 'status-offline', 'status-unknown');

  if (connection.connected === true) {
    connectionStatusEl.classList.add('status-online');
    connectionLabelEl.textContent = 'Connected';
    connectionMetaEl.textContent = `Connected in ${connection.latencyMs}ms`;
    connectionStatusEl.title = `${connection.mintName || 'Mint'} reachable`;
  } else if (connection.connected === false) {
    connectionStatusEl.classList.add('status-offline');
    connectionLabelEl.textContent = 'Disconnected';
    connectionMetaEl.textContent = connection.error || 'Mint unreachable';
    connectionStatusEl.title = connection.error || 'Mint unreachable';
  } else {
    connectionStatusEl.classList.add('status-unknown');
    connectionLabelEl.textContent = 'Checking...';
    connectionMetaEl.textContent = 'Status unknown';
    connectionStatusEl.title = 'Checking mint connection';
  }
}

function applyStageState(options) {
  const { stageEl, bodyEl, lockedHintEl, statusEl, isLocked, lockedText, readyText } = options;
  stageEl.classList.toggle('is-locked', isLocked);
  bodyEl.hidden = isLocked;
  lockedHintEl.hidden = !isLocked;
  statusEl.classList.toggle('stage-badge-locked', isLocked);
  statusEl.textContent = isLocked ? lockedText : readyText;

  bodyEl.querySelectorAll('input, textarea, button').forEach((control) => {
    control.disabled = isLocked;
  });
}

function syncStageStates() {
  const connected = state.connectionOnline === true;

  applyStageState({
    stageEl: stageTopUpEl,
    bodyEl: topUpBodyEl,
    lockedHintEl: topUpLockedHintEl,
    statusEl: topUpStatusEl,
    isLocked: !connected,
    lockedText: 'Locked',
    readyText: 'Ready',
  });

  applyStageState({
    stageEl: stageTransferEl,
    bodyEl: transferBodyEl,
    lockedHintEl: transferLockedHintEl,
    statusEl: transferStatusEl,
    isLocked: !connected,
    lockedText: 'Locked',
    readyText: 'Ready',
  });
}

async function refreshConnectionStatus() {
  const previousConnection = state.connectionOnline;
  const connection = await request('/api/connection-status');
  state.connectionOnline = connection.connected === true ? true : connection.connected === false ? false : null;
  renderConnectionStatus(connection);
  syncStageStates();
  updateActionStates();

  if (previousConnection !== state.connectionOnline) {
    if (state.connectionOnline === true) {
      appendActivity('Mint connection is online', {
        latencyMs: connection.latencyMs,
        mintName: connection.mintName,
      }, 'success');
    } else if (state.connectionOnline === false) {
      appendActivity('Mint connection is offline', {
        error: connection.error,
      }, 'warning');
    }
  }
}

async function refreshState() {
  const summary = await request('/api/state');
  renderSummary(summary);
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
  renderSummary(result);
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
  renderSummary(result);
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
  renderSummary(result);
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
  renderSummary(result);
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
  renderSummary(result);
  clearWorkflowFields({ clearQuote: true, clearTransfer: true });
  appendActivity('Reset wallet proofs', null, 'warning');
  showFeedback('info', 'Wallet proofs reset', 'All local proofs were removed.');
  updateActionStates();
}

function setupActions() {
  $('saveMintBtn').addEventListener('click', () => run(connectMint));
  $('refreshStateBtn').addEventListener('click', () => run(refreshAll));
  createQuoteBtn.addEventListener('click', () => run(createQuote));
  checkQuoteBtn.addEventListener('click', () => run(checkQuote));
  mintQuoteBtn.addEventListener('click', () => run(mintProofs));
  sendBtn.addEventListener('click', () => run(sendToken));
  receiveBtn.addEventListener('click', () => run(receiveToken));
  resetBtn.addEventListener('click', () => run(resetProofs));
  copyTokenBtn.addEventListener('click', async () => {
    if (!sendTokenInput.value) return;
    await navigator.clipboard.writeText(sendTokenInput.value);
    appendActivity('Copied token to clipboard', null, 'info');
    showFeedback('info', 'Copied token', 'Token copied to clipboard.');
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

async function refreshAll() {
  await refreshState();
  await refreshMintInfo();
  await refreshConnectionStatus();
}

async function run(task) {
  try {
    await task();
    await refreshConnectionStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendActivity(`Error: ${message}`, null, 'error');
    showFeedback('error', 'Action failed', message);
  }
}

setupActions();
renderActivity();
syncStageStates();
updateActionStates();
run(refreshAll);
setInterval(() => {
  refreshConnectionStatus().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    state.connectionOnline = false;
    renderConnectionStatus({ connected: false, error: message });
    syncStageStates();
    updateActionStates();
  });
}, 8000);
