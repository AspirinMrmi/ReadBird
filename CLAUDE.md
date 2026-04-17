# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ReadBird is a Chrome Extension (Manifest V3) for saving X/Twitter posts into a local read-later library. It has three runtime surfaces built from the same Vite project:

- `src/background/`: MV3 service worker that handles extension action clicks and message-based save/open requests.
- `src/content/`: content script injected into `x.com` and `twitter.com`; detects tweet context on the page and shows the save overlay UI.
- `src/manager/`: React-based options/manager page (`manager.html`) for browsing, filtering, editing, importing, and exporting saved tweets.
- `src/shared/`: shared domain logic for types, storage, message contracts, constants, and tweet URL parsing.

The extension stores everything in `chrome.storage.local` under a single key, with a memory-store fallback in shared storage helpers so non-extension contexts do not immediately fail.

## Development Commands

- Install deps: `npm install`
- Watch extension build: `npm run dev`
- Production build: `npm run build`
- Type-check only: `npm run typecheck`

There is no dedicated test or lint script in `package.json` right now.

## Build and Load Flow

- `npm run build` runs `tsc --noEmit` first, then Vite build.
- Vite outputs the unpacked extension into `dist/`.
- Load `dist/` in Chrome via `chrome://extensions` → Developer Mode → Load unpacked.

## Architecture Notes

### Build layout

`vite.config.ts` defines a multi-entry build:

- `manager.html` → manager UI bundle
- `src/background/index.ts` → `dist/background.js`
- `src/content/index.tsx` → `dist/content.js`

The manifest in `public/manifest.json` expects those exact output names, so keep Vite entry/output names aligned with the manifest when changing build config.

### Data model

Core persisted types live in `src/shared/types.ts`:

- `PersistedData` is versioned (`version: 1`) and contains `tweets`, `categories`, and `settings`.
- `SavedTweet` is keyed by `id`/`tweetId` and tracks URL, author metadata, category, tags, note, and read state.
- `AppSettings` currently only supports `defaultCategoryId`, though the manager UI does not yet expose it.

Default categories and empty-state initialization are centralized in `src/shared/constants.ts`.

### Storage behavior

`src/shared/storage.ts` is the main persistence layer used by background and manager code:

- Reads/writes all extension data under `STORAGE_KEY`.
- Normalizes malformed or partial stored payloads on read.
- Sorts tweet listings by `updatedAt` descending.
- Treats `tweetId` as the dedupe key when saving/importing.
- Merges imported data by category identity and by newest `updatedAt` for tweet conflicts.

If you change the persisted shape, update both the type definitions and the normalization logic in `loadRawData()`.

### Message flow

The save flow is message-based:

1. The content script gathers tweet context from the current X/Twitter DOM and builds a `TweetDraft`.
2. It sends a `save-tweet` message defined in `src/shared/messages.ts`.
3. The background script handles the message in `src/background/index.ts` and persists via `saveTweetDraft()`.
4. The manager page reads and mutates the same store directly through shared storage helpers.

When changing message payloads, keep `src/shared/messages.ts`, `src/background/index.ts`, and the sender logic in `src/content/index.tsx` in sync.

### Content script behavior

`src/content/index.tsx` is responsible for page integration on X/Twitter:

- Detects tweet URLs via `/status/<id>` patterns.
- Extracts author handle/name heuristically from the page DOM.
- Opens the save overlay when the user activates the X/Twitter “Copy link” menu item.
- Renders the overlay in a shadow root to avoid site CSS collisions.

This file contains both DOM-detection logic and overlay UI. Be careful when editing selectors or heuristics; they are coupled to X/Twitter’s markup and can break silently.

### Manager page behavior

`src/manager/App.tsx` is a single large React component that currently owns:

- initial data loading
- tweet/category refreshes
- search/filter state
- detail editing
- import/export actions
- quick category creation

Most manager actions call shared storage helpers, then fully refresh local state from storage instead of maintaining complex client-side synchronization.

## Important Files

- `public/manifest.json`: extension permissions, content script registration, manager page, and background worker wiring
- `vite.config.ts`: multi-entry build configuration for the extension
- `src/shared/storage.ts`: canonical persistence and import/export behavior
- `src/content/index.tsx`: X/Twitter DOM integration and save overlay
- `src/manager/App.tsx`: main manager UI and state orchestration

## Notes from README

The README documents the product intent, Chrome loading flow, and current permissions:

- permissions: `storage`, `tabs`
- host permissions: `https://x.com/*`, `https://twitter.com/*`
- stack: React, TypeScript, Vite, Tailwind CSS, Manifest V3

It also notes that build artifacts go to `dist/` and that all data is stored locally in the browser.
