import React, { useEffect, useMemo, useState } from 'react';
import { deleteTweet, exportData, importData, listCategories, listTweets, saveCategory, updateTweet } from '../shared/storage';
import type { Category, ReadStateFilter, SavedTweet } from '../shared/types';

const FILTERS: { key: ReadStateFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function CategoryBadge({ category }: { category?: Category }) {
  if (!category) {
    return <span className="rounded-full border border-bird-border px-3 py-1 text-xs text-bird-textMuted">Unsorted</span>;
  }

  return (
    <span className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: category.color }}>
      {category.name}
    </span>
  );
}

function App() {
  const [tweets, setTweets] = useState<SavedTweet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilter, setActiveFilter] = useState<ReadStateFilter>('all');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');

  async function refresh() {
    const [nextTweets, nextCategories] = await Promise.all([listTweets(), listCategories()]);
    setTweets(nextTweets);
    setCategories(nextCategories);
    if (!selectedId && nextTweets[0]) {
      setSelectedId(nextTweets[0].id);
    }
  }

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  const filteredTweets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tweets.filter((tweet) => {
      if (activeFilter === 'read' && !tweet.isRead) {
        return false;
      }
      if (activeFilter === 'unread' && tweet.isRead) {
        return false;
      }
      if (activeCategoryId !== 'all' && tweet.categoryId !== activeCategoryId) {
        return false;
      }
      if (!query) {
        return true;
      }

      const category = categories.find((item) => item.id === tweet.categoryId);
      const haystack = [tweet.authorHandle, tweet.authorName, tweet.note, tweet.url, category?.name, ...tweet.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeCategoryId, activeFilter, categories, search, tweets]);

  const selectedTweet = filteredTweets.find((tweet) => tweet.id === selectedId) ?? filteredTweets[0] ?? null;

  useEffect(() => {
    if (selectedTweet && selectedTweet.id !== selectedId) {
      setSelectedId(selectedTweet.id);
    }
    if (!selectedTweet && filteredTweets.length === 0) {
      setSelectedId(null);
    }
  }, [filteredTweets, selectedId, selectedTweet]);

  async function handleToggleRead(tweet: SavedTweet) {
    await updateTweet(tweet.id, { isRead: !tweet.isRead });
    await refresh();
  }

  async function handleDelete(tweetId: string) {
    await deleteTweet(tweetId);
    await refresh();
  }

  async function handleExport() {
    const payload = await exportData();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `readbird-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const result = await importData(text);
    setImportMessage(`Imported ${result.added} new / ${result.updated} updated`);
    await refresh();
    event.target.value = '';
  }

  async function handleQuickCategoryCreate() {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    const hue = Math.floor(Math.random() * 360);
    await saveCategory(name, `hsl(${hue} 80% 55%)`);
    setNewCategoryName('');
    await refresh();
  }

  async function handleDetailChange(patch: Partial<SavedTweet>) {
    if (!selectedTweet) {
      return;
    }

    await updateTweet(selectedTweet.id, patch);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-bird-bg text-bird-text">
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 px-6 py-6">
        <aside className="sticky top-6 h-[calc(100vh-3rem)] w-72 shrink-0 rounded-bird border border-bird-border bg-bird-panel/95 p-5 shadow-bird backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bird-accentSoft text-xl font-bold text-bird-accent">R</div>
            <div>
              <div className="text-lg font-semibold">ReadBird</div>
              <div className="text-sm text-bird-textMuted">Your X readlist</div>
            </div>
          </div>

          <div className="space-y-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                  activeFilter === filter.key ? 'bg-bird-accentSoft text-bird-text' : 'text-bird-textMuted hover:bg-white/5 hover:text-bird-text'
                }`}
                onClick={() => setActiveFilter(filter.key)}
                type="button"
              >
                <span>{filter.label}</span>
                <span className="text-xs">{filter.key === 'all' ? tweets.length : tweets.filter((tweet) => (filter.key === 'read' ? tweet.isRead : !tweet.isRead)).length}</span>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bird-textMuted">Categories</div>
            <button
              className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${
                activeCategoryId === 'all' ? 'bg-bird-accentSoft text-bird-text' : 'text-bird-textMuted hover:bg-white/5 hover:text-bird-text'
              }`}
              onClick={() => setActiveCategoryId('all')}
              type="button"
            >
              All categories
            </button>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                    activeCategoryId === category.id ? 'bg-bird-accentSoft text-bird-text' : 'text-bird-textMuted hover:bg-white/5 hover:text-bird-text'
                  }`}
                  onClick={() => setActiveCategoryId(category.id)}
                  type="button"
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 rounded-2xl border border-bird-border bg-bird-panelAlt p-3">
              <input
                className="w-full rounded-xl border border-bird-border bg-transparent px-3 py-2 outline-none placeholder:text-bird-textMuted focus:border-bird-accent"
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="New category"
                value={newCategoryName}
              />
              <button className="w-full rounded-full bg-bird-accent px-4 py-2 font-semibold text-black" onClick={handleQuickCategoryCreate} type="button">
                Add category
              </button>
            </div>
          </div>
        </aside>

        <main className="grid min-h-screen flex-1 grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="rounded-bird border border-bird-border bg-bird-panel/95 shadow-bird backdrop-blur">
            <div className="border-b border-bird-border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="min-w-[240px] flex-1 rounded-full border border-bird-border bg-black/30 px-4 py-3 outline-none placeholder:text-bird-textMuted focus:border-bird-accent"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search handles, notes, tags…"
                  value={search}
                />
                <button className="rounded-full border border-bird-border px-4 py-3 text-sm font-medium hover:border-bird-accent hover:text-bird-accent" onClick={handleExport} type="button">
                  Export JSON
                </button>
                <label className="cursor-pointer rounded-full border border-bird-border px-4 py-3 text-sm font-medium hover:border-bird-accent hover:text-bird-accent">
                  Import JSON
                  <input accept="application/json" className="hidden" onChange={handleImport} type="file" />
                </label>
              </div>
              {importMessage ? <p className="mt-3 text-sm text-bird-success">{importMessage}</p> : null}
            </div>

            <div className="divide-y divide-bird-border">
              {filteredTweets.length === 0 ? (
                <div className="p-8 text-center text-bird-textMuted">
                  <div className="text-lg font-semibold text-bird-text">No saved tweets yet</div>
                  <p className="mt-2 text-sm">Use Share → Copy link on X, then save it with ReadBird.</p>
                </div>
              ) : null}

              {filteredTweets.map((tweet) => {
                const category = categories.find((item) => item.id === tweet.categoryId);
                return (
                  <button
                    key={tweet.id}
                    className={`w-full px-5 py-4 text-left transition hover:bg-white/5 ${selectedTweet?.id === tweet.id ? 'bg-white/5' : ''}`}
                    onClick={() => setSelectedId(tweet.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-bird-text">{tweet.authorName ?? tweet.authorHandle ?? 'Unknown author'}</div>
                          {tweet.authorHandle ? <div className="text-sm text-bird-textMuted">@{tweet.authorHandle.replace(/^@/, '')}</div> : null}
                          <div className="text-xs text-bird-textMuted">{formatDate(tweet.updatedAt)}</div>
                        </div>
                        <div className="mt-2 text-sm text-bird-textMuted">{tweet.note?.trim() || tweet.url}</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={category} />
                          {tweet.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-bird-border px-3 py-1 text-xs text-bird-textMuted">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-full px-3 py-1 text-xs font-semibold text-black" style={{ backgroundColor: tweet.isRead ? '#00ba7c' : '#ffd400' }}>
                        {tweet.isRead ? 'Read' : 'Unread'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-bird border border-bird-border bg-bird-panel/95 p-6 shadow-bird backdrop-blur">
            {!selectedTweet ? (
              <div className="flex h-full items-center justify-center text-bird-textMuted">Select a saved tweet to manage it.</div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-bird-border pb-4">
                  <div>
                    <div className="text-xl font-semibold">{selectedTweet.authorName ?? selectedTweet.authorHandle ?? 'Unknown author'}</div>
                    <div className="mt-1 text-sm text-bird-textMuted">Saved {formatDate(selectedTweet.createdAt)}</div>
                  </div>
                  <button
                    className="rounded-full border border-bird-border px-4 py-2 text-sm font-medium hover:border-bird-accent hover:text-bird-accent"
                    onClick={() => window.open(selectedTweet.url, '_blank', 'noopener,noreferrer')}
                    type="button"
                  >
                    Open on X
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-bird-textMuted">Category</label>
                    <select
                      className="w-full rounded-2xl border border-bird-border bg-black/30 px-4 py-3 outline-none focus:border-bird-accent"
                      onChange={(event) => handleDetailChange({ categoryId: event.target.value || undefined })}
                      value={selectedTweet.categoryId ?? ''}
                    >
                      <option value="">Unsorted</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-bird-textMuted">Tags</label>
                    <input
                      className="w-full rounded-2xl border border-bird-border bg-black/30 px-4 py-3 outline-none placeholder:text-bird-textMuted focus:border-bird-accent"
                      defaultValue={selectedTweet.tags.join(', ')}
                      onBlur={(event) => handleDetailChange({ tags: parseTags(event.target.value) })}
                      placeholder="frontend, ai, perf"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-bird-textMuted">Note</label>
                    <textarea
                      className="min-h-40 w-full rounded-3xl border border-bird-border bg-black/30 px-4 py-3 outline-none placeholder:text-bird-textMuted focus:border-bird-accent"
                      defaultValue={selectedTweet.note ?? ''}
                      onBlur={(event) => handleDetailChange({ note: event.target.value })}
                      placeholder="Why save this tweet?"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-bird-textMuted">Original URL</label>
                    <a className="block break-all text-sm text-bird-accent hover:underline" href={selectedTweet.url} rel="noreferrer" target="_blank">
                      {selectedTweet.url}
                    </a>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-3 border-t border-bird-border pt-6">
                  <button
                    className={`rounded-full px-5 py-3 font-semibold ${selectedTweet.isRead ? 'bg-bird-warning text-black' : 'bg-bird-success text-black'}`}
                    onClick={() => handleToggleRead(selectedTweet)}
                    type="button"
                  >
                    {selectedTweet.isRead ? 'Mark unread' : 'Mark read'}
                  </button>
                  <button
                    className="rounded-full border border-red-500/40 px-5 py-3 font-semibold text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(selectedTweet.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
