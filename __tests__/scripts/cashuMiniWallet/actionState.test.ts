import { deriveActionState, parsePositiveInt } from '../../../scripts/cashu/mini-wallet/actionState';

describe('cashu mini-wallet actionState', () => {
  it('parses only positive integers', () => {
    expect(parsePositiveInt('5')).toBe(5);
    expect(parsePositiveInt('0')).toBeNull();
    expect(parsePositiveInt('')).toBeNull();
  });

  it('disables quote follow-up actions when quote id is missing', () => {
    const view = deriveActionState({
      connected: true,
      quoteAmountValue: '5',
      quoteIdValue: '',
      sendAmountValue: '',
      sendTokenValue: '',
      receiveTokenValue: '',
      balance: 0,
      proofCount: 0,
    });

    expect(view.controls.createQuoteDisabled).toBe(false);
    expect(view.controls.checkQuoteDisabled).toBe(true);
    expect(view.controls.mintQuoteDisabled).toBe(true);
    expect(view.hints.quoteHint).toContain('Enter a quote ID');
  });

  it('disables send and reset when proofs are unavailable', () => {
    const view = deriveActionState({
      connected: true,
      quoteAmountValue: '5',
      quoteIdValue: 'abc',
      sendAmountValue: '1',
      sendTokenValue: '',
      receiveTokenValue: '',
      balance: 0,
      proofCount: 0,
    });

    expect(view.controls.sendDisabled).toBe(true);
    expect(view.controls.resetDisabled).toBe(true);
    expect(view.hints.sendHint).toContain('No proofs available');
  });

  it('disables send when amount exceeds balance', () => {
    const view = deriveActionState({
      connected: true,
      quoteAmountValue: '5',
      quoteIdValue: 'abc',
      sendAmountValue: '20',
      sendTokenValue: '',
      receiveTokenValue: '',
      balance: 8,
      proofCount: 2,
    });

    expect(view.controls.sendDisabled).toBe(true);
    expect(view.hints.sendHint).toContain('exceeds balance');
  });
});
