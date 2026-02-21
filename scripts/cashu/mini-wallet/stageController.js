import { deriveActionState } from './actionState.js';

function applyStageState({
  stageEl,
  bodyEl,
  lockedHintEl,
  statusEl,
  isLocked,
  lockedText,
  readyText,
}) {
  stageEl.classList.toggle('is-locked', isLocked);
  bodyEl.hidden = isLocked;
  lockedHintEl.hidden = !isLocked;
  statusEl.classList.toggle('stage-badge-locked', isLocked);
  statusEl.textContent = isLocked ? lockedText : readyText;

  bodyEl.querySelectorAll('input, textarea, button').forEach((control) => {
    control.disabled = isLocked;
  });
}

export function createStageController({
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
}) {
  function syncStageStates(connected) {
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

  function updateActionStates({ connected, quoteAmountValue, quoteIdValue, sendAmountValue, sendTokenValue, receiveTokenValue, balance, proofCount }) {
    const view = deriveActionState({
      connected,
      quoteAmountValue,
      quoteIdValue,
      sendAmountValue,
      sendTokenValue,
      receiveTokenValue,
      balance,
      proofCount,
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
    return view;
  }

  return {
    syncStageStates,
    updateActionStates,
  };
}
