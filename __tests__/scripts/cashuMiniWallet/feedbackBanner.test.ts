/**
 * @jest-environment jsdom
 */

import { createFeedbackBanner } from '../../../scripts/cashu/mini-wallet/feedbackBanner.js';

describe('cashu mini-wallet feedbackBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows feedback and auto-hides after timeout', async () => {
    const banner = document.createElement('div');
    const bannerController = createFeedbackBanner(banner);
    bannerController.showFeedback('success', 'Done', 'Saved');

    expect(banner.hidden).toBe(false);
    expect(banner.className).toBe('feedback-banner feedback-success');
    expect(banner.textContent).toContain('Done');

    await jest.advanceTimersByTimeAsync(5200);
    expect(banner.hidden).toBe(true);
  });

  it('resets hide timer when called again', async () => {
    const banner = document.createElement('div');
    const bannerController = createFeedbackBanner(banner);
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    bannerController.showFeedback('info', 'One', 'First');
    bannerController.showFeedback('error', 'Two', 'Second');

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(5200);
    expect(banner.hidden).toBe(true);
  });
});
