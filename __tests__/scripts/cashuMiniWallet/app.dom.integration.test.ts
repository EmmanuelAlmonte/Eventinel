/**
 * @jest-environment jsdom
 */

const flush = async (ticks = 12) => {
  for (let i = 0; i < ticks; i += 1) {
    await Promise.resolve();
  }
};

function createDomFixture() {
  document.body.innerHTML = `
    <main>
      <input id="mintUrl" />
      <strong id="balance"></strong>
      <strong id="proofCount"></strong>
      <pre id="mintInfo"></pre>
      <div id="activity"></div>
      <div id="connectionStatus" class="status-unknown"></div>
      <span id="connectionLabel"></span>
      <span id="connectionMeta"></span>
      <div id="feedbackBanner" hidden></div>

      <section id="stageTopUp" class="is-locked">
        <p id="topUpLockedHint"></p>
        <div id="topUpBody">
          <input id="quoteAmount" />
          <input id="quoteId" />
          <button id="createQuoteBtn"></button>
          <button id="checkQuoteBtn"></button>
          <button id="mintQuoteBtn"></button>
          <p id="quoteActionHint"></p>
          <textarea id="quoteInvoice"></textarea>
        </div>
        <span id="topUpStatus"></span>
      </section>

      <section id="stageTransfer" class="is-locked">
        <p id="transferLockedHint"></p>
        <div id="transferBody">
          <input id="sendAmount" />
          <textarea id="sendToken"></textarea>
          <textarea id="receiveToken"></textarea>
          <button id="sendBtn"></button>
          <button id="copyTokenBtn"></button>
          <button id="receiveBtn"></button>
          <button id="resetBtn"></button>
          <p id="sendActionHint"></p>
        </div>
        <span id="transferStatus"></span>
      </section>

      <button id="saveMintBtn"></button>
      <button id="refreshStateBtn"></button>

      <div id="resetModal" hidden>
        <button id="resetCancelBtn"></button>
        <button id="resetConfirmBtn"></button>
      </div>
    </main>
  `;
}

describe('cashu mini-wallet app dom integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    createDomFixture();

    const serverState = {
      connected: false,
      mintUrl: 'http://127.0.0.1:3338',
      balance: 0,
      proofCount: 0,
    };

    const jsonResponse = (data: unknown) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => data,
      });

    (global as { fetch: typeof fetch }).fetch = jest.fn(async (input: RequestInfo | URL) => {
      const raw =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url || String(input);
      const path = raw.startsWith('http') ? new URL(raw).pathname : raw;

      if (path === '/api/state') {
        return jsonResponse({
          mintUrl: serverState.mintUrl,
          balance: serverState.balance,
          proofCount: serverState.proofCount,
        });
      }

      if (path === '/api/connection-status') {
        if (serverState.connected) {
          return jsonResponse({ connected: true, latencyMs: 2, mintName: 'Cashu mint' });
        }
        return jsonResponse({ connected: false, error: 'Mint unreachable' });
      }

      if (path === '/api/mint-info') {
        return jsonResponse({ mintInfo: { name: 'Cashu mint' } });
      }

      if (path === '/api/mint-url') {
        serverState.connected = true;
        return jsonResponse({
          mintUrl: serverState.mintUrl,
          balance: serverState.balance,
          proofCount: serverState.proofCount,
          mintInfo: { name: 'Cashu mint' },
        });
      }

      if (path === '/api/reset') {
        serverState.balance = 0;
        serverState.proofCount = 0;
        return jsonResponse({
          mintUrl: serverState.mintUrl,
          balance: serverState.balance,
          proofCount: serverState.proofCount,
        });
      }

      throw new Error(`Unhandled request path: ${path}`);
    }) as unknown as typeof fetch;

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });

    Object.defineProperty(window, '__TEST_SERVER_STATE__', {
      configurable: true,
      value: serverState,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('syncs lock/unlock states and clears transient fields after reset', async () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../scripts/cashu/mini-wallet/app.js');
    });
    await flush();

    const stageTopUp = document.getElementById('stageTopUp') as HTMLElement;
    const createQuoteBtn = document.getElementById('createQuoteBtn') as HTMLButtonElement;
    const checkQuoteBtn = document.getElementById('checkQuoteBtn') as HTMLButtonElement;
    const quoteAmount = document.getElementById('quoteAmount') as HTMLInputElement;
    const quoteId = document.getElementById('quoteId') as HTMLInputElement;
    const quoteInvoice = document.getElementById('quoteInvoice') as HTMLTextAreaElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const sendAmount = document.getElementById('sendAmount') as HTMLInputElement;
    const sendToken = document.getElementById('sendToken') as HTMLTextAreaElement;
    const receiveToken = document.getElementById('receiveToken') as HTMLTextAreaElement;
    const receiveBtn = document.getElementById('receiveBtn') as HTMLButtonElement;
    const refreshBtn = document.getElementById('refreshStateBtn') as HTMLButtonElement;
    const connectBtn = document.getElementById('saveMintBtn') as HTMLButtonElement;
    const resetModal = document.getElementById('resetModal') as HTMLElement;
    const resetConfirmBtn = document.getElementById('resetConfirmBtn') as HTMLButtonElement;
    const balance = document.getElementById('balance') as HTMLElement;
    const proofCount = document.getElementById('proofCount') as HTMLElement;
    const feedback = document.getElementById('feedbackBanner') as HTMLElement;

    expect(stageTopUp.classList.contains('is-locked')).toBe(true);
    expect(createQuoteBtn.disabled).toBe(true);

    connectBtn.click();
    await flush(24);

    const fetchMock = global.fetch as unknown as jest.Mock;
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/mint-url')).toBe(true);

    expect(stageTopUp.classList.contains('is-locked')).toBe(false);
    expect(createQuoteBtn.disabled).toBe(true);
    expect(checkQuoteBtn.disabled).toBe(true);

    quoteAmount.value = '5';
    quoteAmount.dispatchEvent(new Event('input', { bubbles: true }));
    expect(createQuoteBtn.disabled).toBe(false);
    expect(checkQuoteBtn.disabled).toBe(true);

    receiveToken.value = 'cashuB_demo';
    receiveToken.dispatchEvent(new Event('input', { bubbles: true }));
    expect(receiveBtn.disabled).toBe(false);

    // Simulate non-empty wallet then refresh to sync enabled reset state.
    const serverState = (window as unknown as { __TEST_SERVER_STATE__: { balance: number; proofCount: number } })
      .__TEST_SERVER_STATE__;
    serverState.balance = 6;
    serverState.proofCount = 2;
    refreshBtn.click();
    await flush();
    expect(resetBtn.disabled).toBe(false);

    quoteId.value = 'quote_123';
    quoteInvoice.value = 'lnbc_invoice';
    sendAmount.value = '2';
    sendToken.value = 'cashuB_send';
    receiveToken.value = 'cashuB_receive';
    receiveToken.dispatchEvent(new Event('input', { bubbles: true }));

    resetBtn.click();
    expect(resetModal.hidden).toBe(false);
    resetConfirmBtn.click();
    await flush();

    expect(resetModal.hidden).toBe(true);
    expect(balance.textContent).toBe('0');
    expect(proofCount.textContent).toBe('0');
    expect(quoteId.value).toBe('');
    expect(quoteInvoice.value).toBe('');
    expect(sendAmount.value).toBe('');
    expect(sendToken.value).toBe('');
    expect(receiveToken.value).toBe('');
    expect(feedback.textContent).toContain('Wallet proofs reset');
  });

  it('shows feedback when clipboard copy fails', async () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../scripts/cashu/mini-wallet/app.js');
    });
    await flush();

    const connectBtn = document.getElementById('saveMintBtn') as HTMLButtonElement;
    const sendToken = document.getElementById('sendToken') as HTMLTextAreaElement;
    const copyBtn = document.getElementById('copyTokenBtn') as HTMLButtonElement;
    const activity = document.getElementById('activity') as HTMLElement;
    const feedback = document.getElementById('feedbackBanner') as HTMLElement;

    connectBtn.click();
    await flush(24);

    sendToken.value = 'cashuB_token_payload';
    sendToken.dispatchEvent(new Event('input', { bubbles: true }));
    expect(copyBtn.disabled).toBe(false);

    const clipboard = window.navigator.clipboard as unknown as { writeText: jest.Mock };
    const clipboardError = new Error('Write denied by browser');
    clipboardError.name = 'NotAllowedError';
    clipboard.writeText.mockRejectedValueOnce(clipboardError);

    copyBtn.click();
    await flush();

    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toContain('Copy failed');
    expect(feedback.textContent).toContain('Clipboard permission denied');
    expect(activity.textContent).toContain('Copy token failed');
    expect(activity.textContent).toContain('Write denied by browser');
  });
});
