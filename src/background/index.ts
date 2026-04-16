import { saveTweetDraft } from '../shared/storage';
import type { ErrorResponse, ReadBirdMessage, SaveTweetResponse } from '../shared/messages';

function openManagerPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
}

chrome.action.onClicked.addListener(() => {
  openManagerPage();
});

chrome.runtime.onMessage.addListener((message: ReadBirdMessage, _sender, sendResponse: (response: SaveTweetResponse | ErrorResponse | { ok: true }) => void) => {
  if (message.type === 'save-tweet') {
    saveTweetDraft(message.payload)
      .then(({ tweet, isNew }) => {
        sendResponse({ ok: true, tweet, isNew });
      })
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Failed to save tweet' });
      });

    return true;
  }

  if (message.type === 'open-manager') {
    openManagerPage();
    sendResponse({ ok: true });
  }

  return false;
});
