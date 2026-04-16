import { STORAGE_KEY, createEmptyData } from './constants';
import type { Category, ImportResult, PersistedData, SavedTweet, TweetDraft } from './types';

function getChromeStorage(): typeof chrome.storage.local | null {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }

  return null;
}

function createMemoryStore() {
  let memoryData = createEmptyData();

  return {
    async getData(): Promise<PersistedData> {
      return memoryData;
    },
    async setData(nextData: PersistedData): Promise<void> {
      memoryData = nextData;
    },
  };
}

const memoryStore = createMemoryStore();

async function loadRawData(): Promise<PersistedData> {
  const storage = getChromeStorage();
  if (!storage) {
    return memoryStore.getData();
  }

  const result = await storage.get(STORAGE_KEY);
  const data = result[STORAGE_KEY] as PersistedData | undefined;

  if (!data || data.version !== 1) {
    return createEmptyData();
  }

  return {
    ...createEmptyData(),
    ...data,
    tweets: Array.isArray(data.tweets) ? data.tweets : [],
    categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : createEmptyData().categories,
    settings: data.settings ?? {},
  };
}

async function writeRawData(nextData: PersistedData): Promise<void> {
  const storage = getChromeStorage();
  if (!storage) {
    await memoryStore.setData(nextData);
    return;
  }

  await storage.set({ [STORAGE_KEY]: nextData });
}

export async function getData(): Promise<PersistedData> {
  return loadRawData();
}

export async function listTweets(): Promise<SavedTweet[]> {
  const data = await loadRawData();
  return [...data.tweets].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function listCategories(): Promise<Category[]> {
  const data = await loadRawData();
  return data.categories;
}

export async function saveTweetDraft(draft: TweetDraft): Promise<{ tweet: SavedTweet; isNew: boolean }> {
  const data = await loadRawData();
  const now = new Date().toISOString();
  const existingIndex = data.tweets.findIndex((tweet) => tweet.tweetId === draft.tweetId);

  if (existingIndex >= 0) {
    const existing = data.tweets[existingIndex];
    const updated: SavedTweet = {
      ...existing,
      ...draft,
      id: existing.id,
      tweetId: existing.tweetId,
      tags: Array.from(new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))),
      updatedAt: now,
    };
    data.tweets.splice(existingIndex, 1, updated);
    await writeRawData(data);
    return { tweet: updated, isNew: false };
  }

  const created: SavedTweet = {
    id: draft.tweetId,
    tweetId: draft.tweetId,
    url: draft.url,
    authorHandle: draft.authorHandle,
    authorName: draft.authorName,
    categoryId: draft.categoryId,
    tags: Array.from(new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))),
    note: draft.note,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  };

  data.tweets.unshift(created);
  await writeRawData(data);
  return { tweet: created, isNew: true };
}

export async function updateTweet(id: string, patch: Partial<SavedTweet>): Promise<SavedTweet | null> {
  const data = await loadRawData();
  const index = data.tweets.findIndex((tweet) => tweet.id === id);
  if (index < 0) {
    return null;
  }

  const current = data.tweets[index];
  const updated: SavedTweet = {
    ...current,
    ...patch,
    id: current.id,
    tweetId: current.tweetId,
    updatedAt: new Date().toISOString(),
    tags: patch.tags ? Array.from(new Set(patch.tags.map((tag) => tag.trim()).filter(Boolean))) : current.tags,
  };
  data.tweets.splice(index, 1, updated);
  await writeRawData(data);
  return updated;
}

export async function deleteTweet(id: string): Promise<boolean> {
  const data = await loadRawData();
  const nextTweets = data.tweets.filter((tweet) => tweet.id !== id);
  if (nextTweets.length === data.tweets.length) {
    return false;
  }

  data.tweets = nextTweets;
  await writeRawData(data);
  return true;
}

export async function saveCategory(name: string, color: string): Promise<Category> {
  const data = await loadRawData();
  const normalizedName = name.trim();
  const existing = data.categories.find((category) => category.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return existing;
  }

  const category: Category = {
    id: normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`,
    name: normalizedName,
    color,
    createdAt: new Date().toISOString(),
  };
  data.categories.push(category);
  await writeRawData(data);
  return category;
}

export async function exportData(): Promise<string> {
  const data = await loadRawData();
  return JSON.stringify(data, null, 2);
}

export async function importData(raw: string): Promise<ImportResult> {
  const parsed = JSON.parse(raw) as Partial<PersistedData>;
  const incoming: Partial<PersistedData> = {
    settings: parsed.settings,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    tweets: Array.isArray(parsed.tweets) ? parsed.tweets : [],
  };
  const base = await loadRawData();
  const nextData: PersistedData = {
    version: 1,
    categories: [...base.categories],
    settings: { ...base.settings, ...(incoming.settings ?? {}) },
    tweets: [...base.tweets],
  };

  for (const incomingCategory of incoming.categories ?? []) {
    const exists = nextData.categories.some((category) => category.id === incomingCategory.id || category.name === incomingCategory.name);
    if (!exists) {
      nextData.categories.push(incomingCategory);
    }
  }

  let added = 0;
  let updated = 0;
  for (const incomingTweet of incoming.tweets ?? []) {
    const index = nextData.tweets.findIndex((tweet) => tweet.tweetId === incomingTweet.tweetId);
    if (index < 0) {
      nextData.tweets.push(incomingTweet);
      added += 1;
      continue;
    }

    if (Date.parse(incomingTweet.updatedAt) >= Date.parse(nextData.tweets[index].updatedAt)) {
      nextData.tweets[index] = incomingTweet;
      updated += 1;
    }
  }

  await writeRawData(nextData);
  return { added, updated };
}
