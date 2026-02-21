export const MAX_ACTIVITY_ITEMS = 40;
export const PAYLOAD_PREVIEW_LIMIT = 280;

function payloadToText(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
}

function createPayloadBlock(payloadText, showFeedback) {
  const payloadEl = document.createElement('div');
  payloadEl.className = 'activity-payload';

  const pre = document.createElement('pre');
  payloadEl.append(pre);

  const isCollapsible = payloadText.length > PAYLOAD_PREVIEW_LIMIT;
  let expanded = !isCollapsible;

  const render = () => {
    pre.textContent = expanded ? payloadText : `${payloadText.slice(0, PAYLOAD_PREVIEW_LIMIT)}...`;
  };

  render();

  const actions = document.createElement('div');
  actions.className = 'activity-actions';

  if (isCollapsible) {
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

function renderActivityItems(activityEl, items, showFeedback) {
  activityEl.replaceChildren();

  if (items.length === 0) {
    const emptyEl = document.createElement('p');
    emptyEl.className = 'activity-empty';
    emptyEl.textContent = 'No activity yet.';
    activityEl.append(emptyEl);
    return;
  }

  for (const item of items) {
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
      itemEl.append(createPayloadBlock(item.payloadText, showFeedback));
    }

    activityEl.append(itemEl);
  }
}

export function createActivityFeed(activityEl, showFeedback) {
  let activityCounter = 0;
  const activityItems = [];

  function appendActivity(title, payload, level = 'info') {
    activityItems.unshift({
      id: activityCounter += 1,
      title,
      level,
      payloadText: payloadToText(payload),
      timeLabel: new Date().toLocaleTimeString(),
    });

    if (activityItems.length > MAX_ACTIVITY_ITEMS) {
      activityItems.length = MAX_ACTIVITY_ITEMS;
    }

    renderActivityItems(activityEl, activityItems, showFeedback);
  }

  function renderActivity() {
    renderActivityItems(activityEl, activityItems, showFeedback);
  }

  renderActivity();

  function getActivityItems() {
    return [...activityItems];
  }

  return {
    appendActivity,
    renderActivity,
    getActivityItems,
  };
}
