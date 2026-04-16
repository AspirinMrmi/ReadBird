import type { SavedTweet, TweetDraft } from './types';

export type SaveTweetMessage = {
  type: 'save-tweet';
  payload: TweetDraft;
};

export type OpenManagerMessage = {
  type: 'open-manager';
};

export type ReadBirdMessage = SaveTweetMessage | OpenManagerMessage;

export type SaveTweetResponse = {
  ok: true;
  tweet: SavedTweet;
  isNew: boolean;
};

export type ErrorResponse = {
  ok: false;
  error: string;
};
