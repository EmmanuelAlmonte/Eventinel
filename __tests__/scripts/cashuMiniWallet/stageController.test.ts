/**
 * @jest-environment jsdom
 */

import { createStageController } from '../../../scripts/cashu/mini-wallet/stageController.js';

function createButton() {
  const btn = document.createElement('button');
  return btn;
}

function createField() {
  const field = document.createElement('div');
  return field;
}

describe('cashu mini-wallet stageController', () => {
  it('locks and unlocks stages based on connection state', () => {
    const topUpBody = createField();
    const transferBody = createField();
    const stage = {
      topUp: createField(),
      transfer: createField(),
      topUpHint: document.createElement('p'),
      transferHint: document.createElement('p'),
      topUpStatus: document.createElement('span'),
      transferStatus: document.createElement('span'),
    };
    const stageController = createStageController({
      createQuoteBtn: createButton(),
      checkQuoteBtn: createButton(),
      mintQuoteBtn: createButton(),
      sendBtn: createButton(),
      copyTokenBtn: createButton(),
      receiveBtn: createButton(),
      resetBtn: createButton(),
      quoteActionHintEl: createField(),
      sendActionHintEl: createField(),
      stageTopUpEl: stage.topUp,
      topUpBodyEl: topUpBody,
      topUpLockedHintEl: stage.topUpHint,
      topUpStatusEl: stage.topUpStatus,
      stageTransferEl: stage.transfer,
      transferBodyEl: transferBody,
      transferLockedHintEl: stage.transferHint,
      transferStatusEl: stage.transferStatus,
    });

    topUpBody.append(document.createElement('input'));
    topUpBody.append(document.createElement('textarea'));
    transferBody.append(document.createElement('input'));
    transferBody.append(document.createElement('button'));

    stageController.syncStageStates(false);
    expect(stage.topUp.className).toContain('is-locked');
    expect(topUpBody.hidden).toBe(true);
    expect(stage.topUpHint.hidden).toBe(false);
    expect(transferBody.hidden).toBe(true);
    expect(stage.topUpStatus.textContent).toBe('Locked');

    stageController.syncStageStates(true);
    expect(topUpBody.hidden).toBe(false);
    expect(stage.topUpHint.hidden).toBe(true);
    expect(transferBody.hidden).toBe(false);
    expect(stage.topUpStatus.textContent).toBe('Ready');
  });

  it('maps workflow state into action enablement and hints', () => {
    const stageController = createStageController({
      createQuoteBtn: createButton(),
      checkQuoteBtn: createButton(),
      mintQuoteBtn: createButton(),
      sendBtn: createButton(),
      copyTokenBtn: createButton(),
      receiveBtn: createButton(),
      resetBtn: createButton(),
      quoteActionHintEl: createField(),
      sendActionHintEl: createField(),
      stageTopUpEl: createField(),
      topUpBodyEl: createField(),
      topUpLockedHintEl: createField(),
      topUpStatusEl: createField(),
      stageTransferEl: createField(),
      transferBodyEl: createField(),
      transferLockedHintEl: createField(),
      transferStatusEl: createField(),
    });

    const view = stageController.updateActionStates({
      connected: false,
      quoteAmountValue: '',
      quoteIdValue: '',
      sendAmountValue: '',
      sendTokenValue: '',
      receiveTokenValue: '',
      balance: 0,
      proofCount: 0,
    });

    expect(view.controls.createQuoteDisabled).toBe(true);
    expect(view.controls.sendDisabled).toBe(true);
  });
}); 
