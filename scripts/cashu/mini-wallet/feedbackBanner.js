export function createFeedbackBanner(feedbackBannerEl) {
  let feedbackTimer = null;

  function clearBannerTimer() {
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
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

    clearBannerTimer();
    feedbackTimer = window.setTimeout(() => {
      feedbackBannerEl.hidden = true;
    }, 5200);
  }

  return {
    showFeedback,
  };
}
