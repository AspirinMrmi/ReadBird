type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

type PersistedData = {
  version: 1;
  tweets: Array<Record<string, unknown>>;
  categories: Category[];
  settings: Record<string, unknown>;
};

type PendingTweet = {
  url: string;
  authorHandle?: string;
  authorName?: string;
};

type TweetDraft = {
  url: string;
  tweetId: string;
  authorHandle?: string;
  authorName?: string;
  categoryId?: string;
  tags: string[];
  note?: string;
};

type SaveTweetResponse =
  | {
      ok: true;
      isNew: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const STORAGE_KEY = 'readbird:data';
const OVERLAY_ID = 'readbird-overlay';
const TWEET_URL_RE = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i;
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    color: '#1d9bf0',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'backend',
    name: 'Backend',
    color: '#7856ff',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'ai',
    name: 'AI',
    color: '#00ba7c',
    createdAt: new Date(0).toISOString(),
  },
];

let activeTweetUrl: string | null = normalizeTweetUrl(window.location.href);

function createEmptyData(): PersistedData {
  return {
    version: 1,
    tweets: [],
    categories: DEFAULT_CATEGORIES,
    settings: {},
  };
}

async function getData(): Promise<PersistedData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data = result[STORAGE_KEY] as PersistedData | undefined;
  if (!data || data.version !== 1) {
    return createEmptyData();
  }

  return {
    ...createEmptyData(),
    ...data,
    tweets: Array.isArray(data.tweets) ? data.tweets : [],
    categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES,
    settings: data.settings ?? {},
  };
}

async function setData(data: PersistedData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function listCategories(): Promise<Category[]> {
  const data = await getData();
  return data.categories;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomCategoryColor(): string {
  return `hsl(${Math.floor(Math.random() * 360)} 80% 55%)`;
}

async function saveCategory(name: string): Promise<Category> {
  const normalizedName = name.trim();
  const data = await getData();
  const existing = data.categories.find((category) => category.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return existing;
  }

  const category: Category = {
    id: slugify(normalizedName) || `cat-${Date.now()}`,
    name: normalizedName,
    color: randomCategoryColor(),
    createdAt: new Date().toISOString(),
  };

  data.categories.push(category);
  await setData(data);
  return category;
}

function normalizeTweetUrl(rawUrl: string): string | null {
  const match = rawUrl.match(TWEET_URL_RE);
  if (!match) {
    return null;
  }

  const [, handle, tweetId] = match;
  return `https://x.com/${handle}/status/${tweetId}`;
}

function extractTweetId(rawUrl: string): string | null {
  const normalized = normalizeTweetUrl(rawUrl);
  if (!normalized) {
    return null;
  }

  return normalized.split('/').pop() ?? null;
}

function buildTweetDraft(pendingTweet: PendingTweet, categoryId: string | undefined, tagsRaw: string, noteRaw: string): TweetDraft | null {
  const url = normalizeTweetUrl(pendingTweet.url);
  const tweetId = url ? extractTweetId(url) : null;
  if (!url || !tweetId) {
    return null;
  }

  return {
    url,
    tweetId,
    authorHandle: pendingTweet.authorHandle,
    authorName: pendingTweet.authorName,
    categoryId,
    tags: tagsRaw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    note: noteRaw.trim() || undefined,
  };
}

function getArticleFromTarget(target: HTMLElement | null): HTMLElement | null {
  return target?.closest('article') ?? null;
}

function getTweetAnchor(article: HTMLElement | null): HTMLAnchorElement | null {
  if (!article) {
    return null;
  }

  const anchor = Array.from(article.querySelectorAll('a[href*="/status/"]')).find((element) => {
    const href = element.getAttribute('href') ?? '';
    return /\/status\/\d+/.test(href);
  });

  return (anchor as HTMLAnchorElement | undefined) ?? null;
}

function getTweetMetadata(article: HTMLElement | null): Pick<PendingTweet, 'authorHandle' | 'authorName'> {
  if (!article) {
    return {};
  }

  const userLink = Array.from(article.querySelectorAll('a[href^="/"]')).find((element) => {
    const href = element.getAttribute('href') ?? '';
    return /^\/[A-Za-z0-9_]{1,15}$/.test(href);
  }) as HTMLAnchorElement | undefined;

  return {
    authorHandle: userLink?.getAttribute('href')?.replace('/', ''),
    authorName: userLink?.textContent?.trim(),
  };
}

function resolvePendingTweet(target: HTMLElement): PendingTweet | null {
  const article = getArticleFromTarget(target);
  const anchorUrl = getTweetAnchor(article)?.href;
  const fallbackUrl = normalizeTweetUrl(window.location.href);
  const url = normalizeTweetUrl(anchorUrl ?? activeTweetUrl ?? fallbackUrl ?? '');

  if (!url) {
    return null;
  }

  return {
    url,
    ...getTweetMetadata(article),
  };
}

function isCopyLinkMenuItem(target: HTMLElement): boolean {
  const menuItem = target.closest('[role="menuitem"]');
  if (!menuItem) {
    return false;
  }

  const text = menuItem.textContent?.trim().toLowerCase() ?? '';
  return text.includes('copy link') || text.includes('复制链接');
}

function closeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.removeEventListener('keydown', handleOverlayEscape, true);
}

function handleOverlayEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeOverlay();
  }
}

function showStatus(element: HTMLElement, message: string, tone: 'success' | 'error'): void {
  element.textContent = message;
  element.style.color = tone === 'success' ? '#00ba7c' : '#f4212e';
}

async function showOverlay(pendingTweet: PendingTweet): Promise<void> {
  closeOverlay();

  const host = document.createElement('div');
  host.id = OVERLAY_ID;
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483647';

  const shadowRoot = host.attachShadow({ mode: 'open' });
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      .rb-shell {
        position: fixed;
        inset: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e7e9ea;
      }
      .rb-backdrop {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.65);
      }
      .rb-panel {
        width: 100%;
        max-width: 420px;
        border-radius: 24px;
        border: 1px solid #2f3336;
        background: #16181c;
        color: #e7e9ea;
        padding: 20px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      }
      .rb-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .rb-kicker {
        margin: 0;
        color: #71767b;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
      }
      .rb-title {
        margin: 8px 0 0;
        font-size: 20px;
        font-weight: 700;
      }
      .rb-url {
        margin: 8px 0 0;
        color: #71767b;
        font-size: 14px;
        word-break: break-all;
      }
      .rb-close,
      .rb-secondary,
      .rb-primary {
        border-radius: 999px;
        cursor: pointer;
        font-size: 14px;
      }
      .rb-close,
      .rb-secondary {
        border: 1px solid #2f3336;
        background: transparent;
        color: #e7e9ea;
        padding: 10px 14px;
      }
      .rb-primary {
        border: none;
        background: #1d9bf0;
        color: #000;
        padding: 12px 18px;
        font-weight: 700;
      }
      .rb-grid {
        margin-top: 20px;
        display: grid;
        gap: 16px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        color: #71767b;
        font-size: 14px;
      }
      input,
      textarea,
      select {
        width: 100%;
        border: 1px solid #2f3336;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.3);
        color: #e7e9ea;
        padding: 12px 16px;
        outline: none;
      }
      textarea {
        min-height: 112px;
        resize: vertical;
      }
      .rb-actions {
        margin-top: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .rb-status {
        min-height: 20px;
        margin-top: 12px;
        font-size: 14px;
      }
      .rb-primary[disabled] {
        opacity: 0.65;
        cursor: default;
      }
    </style>
    <div class="rb-shell">
      <div class="rb-backdrop">
        <div class="rb-panel" role="dialog" aria-modal="true" aria-label="Save to ReadBird">
          <div class="rb-top">
            <div>
              <p class="rb-kicker">ReadBird</p>
              <h2 class="rb-title"></h2>
              <p class="rb-url"></p>
            </div>
            <button class="rb-close" type="button">Close</button>
          </div>
          <div class="rb-grid">
            <div>
              <label for="rb-category-select">Category</label>
              <select id="rb-category-select">
                <option value="">Unsorted</option>
              </select>
            </div>
            <div>
              <label for="rb-new-category">Quick new category</label>
              <input id="rb-new-category" placeholder="e.g. LLM infra" />
            </div>
            <div>
              <label for="rb-tags">Tags</label>
              <input id="rb-tags" placeholder="frontend, ai, perf" />
            </div>
            <div>
              <label for="rb-note">Note</label>
              <textarea id="rb-note" placeholder="What made this worth saving?"></textarea>
            </div>
          </div>
          <div class="rb-actions">
            <button class="rb-secondary rb-open" type="button">Open library</button>
            <button class="rb-primary rb-save" type="button">Save to ReadBird</button>
          </div>
          <div class="rb-status"></div>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(host);
  document.addEventListener('keydown', handleOverlayEscape, true);

  const titleElement = shadowRoot.querySelector('.rb-title');
  const urlElement = shadowRoot.querySelector('.rb-url');
  const categorySelect = shadowRoot.querySelector('#rb-category-select') as HTMLSelectElement | null;
  const newCategoryInput = shadowRoot.querySelector('#rb-new-category') as HTMLInputElement | null;
  const tagsInput = shadowRoot.querySelector('#rb-tags') as HTMLInputElement | null;
  const noteInput = shadowRoot.querySelector('#rb-note') as HTMLTextAreaElement | null;
  const saveButton = shadowRoot.querySelector('.rb-save') as HTMLButtonElement | null;
  const openButton = shadowRoot.querySelector('.rb-open') as HTMLButtonElement | null;
  const closeButton = shadowRoot.querySelector('.rb-close') as HTMLButtonElement | null;
  const backdrop = shadowRoot.querySelector('.rb-backdrop') as HTMLDivElement | null;
  const panel = shadowRoot.querySelector('.rb-panel') as HTMLDivElement | null;
  const statusElement = shadowRoot.querySelector('.rb-status') as HTMLDivElement | null;

  if (
    !titleElement ||
    !urlElement ||
    !categorySelect ||
    !newCategoryInput ||
    !tagsInput ||
    !noteInput ||
    !saveButton ||
    !openButton ||
    !closeButton ||
    !backdrop ||
    !panel ||
    !statusElement
  ) {
    closeOverlay();
    return;
  }

  titleElement.textContent = pendingTweet.authorName ?? pendingTweet.authorHandle ?? 'Save this post';
  urlElement.textContent = pendingTweet.url;

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  panel.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });

  closeButton.addEventListener('click', () => {
    closeOverlay();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeOverlay();
    }
  });

  openButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open-manager' });
  });

  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    statusElement.textContent = '';

    try {
      let categoryId = categorySelect.value || undefined;
      if (newCategoryInput.value.trim()) {
        const category = await saveCategory(newCategoryInput.value);
        categoryId = category.id;
      }

      const draft = buildTweetDraft(pendingTweet, categoryId, tagsInput.value, noteInput.value);
      if (!draft) {
        showStatus(statusElement, 'ReadBird could not parse this tweet link.', 'error');
        saveButton.disabled = false;
        return;
      }

      chrome.runtime.sendMessage({ type: 'save-tweet', payload: draft }, (response: SaveTweetResponse | undefined) => {
        if (!response || !response.ok) {
          showStatus(statusElement, response && 'error' in response ? response.error : 'Failed to save tweet', 'error');
          saveButton.disabled = false;
          return;
        }

        showStatus(statusElement, response.isNew ? 'Saved to ReadBird.' : 'Updated in ReadBird.', 'success');
        window.setTimeout(closeOverlay, 700);
      });
    } catch (error) {
      showStatus(statusElement, error instanceof Error ? error.message : 'Failed to save tweet', 'error');
      saveButton.disabled = false;
    }
  });

  try {
    const categories = await listCategories();
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    }
  } catch {
    // Keep the form usable with the default Unsorted option.
  }
}

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }

  const article = getArticleFromTarget(target);
  const articleUrl = getTweetAnchor(article)?.href;
  if (articleUrl) {
    activeTweetUrl = normalizeTweetUrl(articleUrl);
  }

  if (!isCopyLinkMenuItem(target)) {
    return;
  }

  window.setTimeout(() => {
    const pendingTweet = resolvePendingTweet(target);
    if (pendingTweet) {
      void showOverlay(pendingTweet);
    }
  }, 60);
}

function bootstrap(): void {
  if (window.location.hostname !== 'x.com' && window.location.hostname !== 'twitter.com') {
    return;
  }

  document.addEventListener('click', handleClick, true);
}

bootstrap();
