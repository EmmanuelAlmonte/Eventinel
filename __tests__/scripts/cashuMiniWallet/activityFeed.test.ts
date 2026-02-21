/**
 * @jest-environment jsdom
 */

import { createActivityFeed, MAX_ACTIVITY_ITEMS, PAYLOAD_PREVIEW_LIMIT } from '../../../scripts/cashu/mini-wallet/activityFeed.js';

describe('cashu mini-wallet activityFeed', () => {
  it('renders activity entries and trims to the configured max length', () => {
    const activityEl = document.createElement('div');
    const showFeedback = jest.fn();
    const feed = createActivityFeed(activityEl, showFeedback);

    Array.from({ length: MAX_ACTIVITY_ITEMS + 2 }, (_, index) =>
      feed.appendActivity(`item-${index + 1}`, { value: index }, 'info'),
    );

    expect(activityEl.querySelectorAll('article').length).toBe(MAX_ACTIVITY_ITEMS);
    expect(feed.getActivityItems().length).toBe(MAX_ACTIVITY_ITEMS);
    expect(activityEl.querySelector('article')?.textContent).toContain('item-42');
  });

  it('copies full payload text with feedback', async () => {
    const activityEl = document.createElement('div');
    const showFeedback = jest.fn();
    const payload = { deep: { value: true } };
    const longText = 'x'.repeat(PAYLOAD_PREVIEW_LIMIT + 20);
    const feed = createActivityFeed(activityEl, showFeedback);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    feed.appendActivity('long', longText, 'info');
    const copyBtn = activityEl.querySelector('button:last-child') as HTMLButtonElement;
    await copyBtn.click();
    expect(writeText).toHaveBeenCalledWith(longText);
    expect(showFeedback).toHaveBeenCalledWith('info', 'Copied payload', 'Activity payload copied to clipboard.');

    feed.appendActivity('obj', payload, 'info');
    const copyBtn2 = activityEl.querySelector('article:first-child button:last-child') as HTMLButtonElement;
    await copyBtn2.click();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(showFeedback).toHaveBeenCalledWith('info', 'Copied payload', 'Activity payload copied to clipboard.');
  });
}); 
