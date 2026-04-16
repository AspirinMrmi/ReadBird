export type ReadStateFilter = 'all' | 'unread' | 'read';

export type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type SavedTweet = {
  id: string;
  tweetId: string;
  url: string;
  authorHandle?: string;
  authorName?: string;
  categoryId?: string;
  tags: string[];
  note?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  defaultCategoryId?: string;
};

export type PersistedData = {
  version: 1;
  tweets: SavedTweet[];
  categories: Category[];
  settings: AppSettings;
};

export type TweetDraft = {
  url: string;
  tweetId: string;
  authorHandle?: string;
  authorName?: string;
  categoryId?: string;
  tags: string[];
  note?: string;
};

export type ImportResult = {
  added: number;
  updated: number;
};
