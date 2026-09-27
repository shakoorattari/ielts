import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { THEMES, ITEM_BY_ID, searchItems } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import type { MasteryStatus } from '../types';

const STATUS_STYLES: Record<MasteryStatus, string> = {
  new: 'bg-ink-soft/10 text-ink-soft',
  learning: 'bg-amber-100 text-amber-500',
  review: 'bg-brand-100 text-brand-600',
  mastered: 'bg-mint-100 text-mint-500',
};

export function Browse() {
  const [params, setParams] = useSearchParams();
  const { getProgress } = useProgress();
  const [query, setQuery] = useState('');

  const activeThemeId = params.get('theme') ? Number(params.get('theme')) : null;
  const activeTopicKey = params.get('topic');

  const searchResults = useMemo(() => searchItems(query), [query]);

  const activeTheme = THEMES.find((t) => t.id === activeThemeId) ?? null;
  const activeTopic = activeTheme?.topics.find((t) => `${activeTheme.id}-${t.id}` === activeTopicKey) ?? null;

  function selectTheme(id: number | null) {
    if (id === null) {
      setParams({});
    } else {
      setParams({ theme: String(id) });
    }
  }

  function selectTopic(themeId: number, topicId: number) {
    setParams({ theme: String(themeId), topic: `${themeId}-${topicId}` });
  }

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse collocations</h1>
        <p className="mt-1 text-ink-soft">Study by theme and topic, or search all 1000 entries.</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a word, phrase, or meaning…"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-500"
      />

      {query.trim() ? (
        <div className="grid gap-3">
          <p className="text-sm text-ink-soft">{searchResults.length} results</p>
          {searchResults.map((item) => (
            <CollocationCard key={item.id} itemId={item.id} status={getProgress(item.id).status} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <button
              onClick={() => selectTheme(null)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                activeThemeId === null ? 'bg-brand-500 text-white' : 'hover:bg-brand-50'
              }`}
            >
              All themes
            </button>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  activeThemeId === theme.id ? 'bg-brand-500 text-white' : 'hover:bg-brand-50'
                }`}
              >
                {theme.id}. {theme.title}
              </button>
            ))}
          </aside>

          <div className="flex flex-col gap-4">
            {!activeTheme && (
              <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
                Pick a theme to see its 10 topics, or search above.
              </p>
            )}

            {activeTheme && !activeTopic && (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeTheme.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => selectTopic(activeTheme.id, topic.id)}
                    className="rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand-300"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Topic {topic.id}
                    </p>
                    <p className="mt-1 font-medium">{topic.title}</p>
                    <p className="mt-1 text-xs text-ink-soft">10 collocations</p>
                  </button>
                ))}
              </div>
            )}

            {activeTheme && activeTopic && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => selectTheme(activeTheme.id)}
                  className="self-start text-sm font-medium text-brand-500 hover:underline"
                >
                  ← Back to {activeTheme.title} topics
                </button>
                <h2 className="text-lg font-semibold">{activeTopic.title}</h2>
                {activeTopic.itemIds.map((id) => (
                  <CollocationCard key={id} itemId={id} status={getProgress(id).status} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CollocationCard({ itemId, status }: { itemId: string; status: MasteryStatus }) {
  const item = ITEM_BY_ID[itemId];
  if (!item) return null;
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {item.term} <span className="text-ink-soft">— {item.usage}</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{item.meaning}</p>
          <p className="mt-2 text-sm italic text-brand-600">“{item.example}”</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
