const $ = (id) => document.getElementById(id);

const mintUrlInput = $('mintUrl');
const balanceEl = $('balance');
const proofCountEl = $('proofCount');
const mintInfoEl = $('mintInfo');
const activityEl = $('activity');
const connectionStatusEl = $('connectionStatus');
const connectionLabelEl = $('connectionLabel');
const connectionMetaEl = $('connectionMeta');

const quoteAmountInput = $('quoteAmount');
const quoteIdInput = $('quoteId');
const quoteInvoiceInput = $('quoteInvoice');
const sendAmountInput = $('sendAmount');
const sendTokenInput = $('sendToken');
const receiveTokenInput = $('receiveToken');

const state = {
  mintUrl: '',
  connectionOnline: null,
};

function appendActivity(title, payload) {
  const now = new Date().toLocaleTimeString();
  const line = payload ? `${now} ${title}\n${JSON.stringify(payload, null, 2)}\n` : `${now} ${title}\n`;
  activityEl.textContent = `${line}${activityEl.textContent}`.trim();
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

function renderSummary(summary) {
  state.mintUrl = summary.mintUrl || state.mintUrl;
  mintUrlInput.value = state.mintUrl;
  balanceEl.textContent = String(summary.balance ?? 0);
  proofCountEl.textContent = String(summary.proofCount ?? 0);
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

async function refreshConnectionStatus() {
  const connection = await request('/api/connection-status');
  renderConnectionStatus(connection);

  if (state.connectionOnline !== connection.connected) {
    state.connectionOnline = connection.connected;
    if (connection.connected) {
      appendActivity('Mint connection is online', {
        latencyMs: connection.latencyMs,
        mintName: connection.mintName,
      });
    } else {
      appendActivity('Mint connection is offline', {
        error: connection.error,
      });
    }
  }
}

async function refreshState() {
  const summary = await request('/api/state');
  renderSummary(summary);
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
  mintInfoEl.textContent = JSON.stringify(result.mintInfo, null, 2);
  appendActivity(`Connected mint ${mintUrl}`);
}

async function createQuote() {
  const amount = Number.parseInt(quoteAmountInput.value.trim(), 10);
  const result = await request('/api/create-quote', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  quoteIdInput.value = result.quote.quote;
  quoteInvoiceInput.value = result.quote.request || '';
  appendActivity('Created mint quote', result.quote);
}

async function checkQuote() {
  const quote = quoteIdInput.value.trim();
  const result = await request('/api/check-quote', {
    method: 'POST',
    body: JSON.stringify({ quote }),
  });
  quoteInvoiceInput.value = result.quote.request || quoteInvoiceInput.value;
  appendActivity('Checked quote', result.quote);
}

async function mintProofs() {
  const amount = Number.parseInt(quoteAmountInput.value.trim(), 10);
  const quote = quoteIdInput.value.trim();
  const result = await request('/api/mint-proofs', {
    method: 'POST',
    body: JSON.stringify({ amount, quote }),
  });
  renderSummary(result);
  appendActivity('Minted proofs', result);
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
  });
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
  });
}

async function resetProofs() {
  const ok = window.confirm('Reset all proofs in mini wallet? This cannot be undone.');
  if (!ok) return;
  const result = await request('/api/reset', {
    method: 'POST',
    body: JSON.stringify({ confirm: true }),
  });
  renderSummary(result);
  sendTokenInput.value = '';
  appendActivity('Reset wallet proofs');
}

function setupActions() {
  $('saveMintBtn').addEventListener('click', () => run(connectMint));
  $('refreshStateBtn').addEventListener('click', () => run(refreshAll));
  $('createQuoteBtn').addEventListener('click', () => run(createQuote));
  $('checkQuoteBtn').addEventListener('click', () => run(checkQuote));
  $('mintQuoteBtn').addEventListener('click', () => run(mintProofs));
  $('sendBtn').addEventListener('click', () => run(sendToken));
  $('receiveBtn').addEventListener('click', () => run(receiveToken));
  $('resetBtn').addEventListener('click', () => run(resetProofs));
  $('copyTokenBtn').addEventListener('click', async () => {
    if (!sendTokenInput.value) return;
    await navigator.clipboard.writeText(sendTokenInput.value);
    appendActivity('Copied token to clipboard');
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
    appendActivity(`Error: ${message}`);
    window.alert(message);
  }
}

setupActions();
run(refreshAll);
setInterval(() => {
  refreshConnectionStatus().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    renderConnectionStatus({ connected: false, error: message });
  });
}, 8000);
