import type { TweetDraft } from './types';

const TWEET_URL_RE = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i;

export function normalizeTweetUrl(rawUrl: string): string | null {
  const match = rawUrl.match(TWEET_URL_RE);
  if (!match) {
    return null;
  }

  const [, handle, tweetId] = match;
  return `https://x.com/${handle}/status/${tweetId}`;
}

export function extractTweetId(rawUrl: string): string | null {
  const normalized = normalizeTweetUrl(rawUrl);
  if (!normalized) {
    return null;
  }

  return normalized.split('/').pop() ?? null;
}

export function extractHandle(rawUrl: string): string | undefined {
  const match = rawUrl.match(TWEET_URL_RE);
  return match?.[1];
}

export function buildTweetDraft(rawUrl: string, metadata?: Partial<TweetDraft>): TweetDraft | null {
  const url = normalizeTweetUrl(rawUrl);
  const tweetId = url ? extractTweetId(url) : null;

  if (!url || !tweetId) {
    return null;
  }

  return {
    url,
    tweetId,
    authorHandle: metadata?.authorHandle ?? extractHandle(url),
    authorName: metadata?.authorName,
    categoryId: metadata?.categoryId,
    tags: metadata?.tags ?? [],
    note: metadata?.note,
  };
}

export function isTweetUrl(rawUrl: string): boolean {
  return normalizeTweetUrl(rawUrl) !== null;
}
