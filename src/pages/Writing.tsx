import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { THEMES } from '../lib/collocations';
import { ITEM_BY_ID } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';

export function Writing() {
  const [params, setParams] = useSearchParams();
  const { state, setWritingNote, toggleWritingCheck } = useProgress();

  const themeId = params.get('theme') ? Number(params.get('theme')) : THEMES[0].id;
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const topicId = params.get('topic') ? Number(params.get('topic')) : theme.topics[0].id;
  const topic = theme.topics.find((t) => t.id === topicId) ?? theme.topics[0];
  const topicKey = `${theme.id}-${topic.id}`;

  const [draft, setDraft] = useState(state.writingNotes[topicKey] ?? '');

  function selectTheme(id: number) {
    const t = THEMES.find((th) => th.id === id)!;
    setParams({ theme: String(id), topic: String(t.topics[0].id) });
    setDraft(state.writingNotes[`${id}-${t.topics[0].id}`] ?? '');
  }

  function selectTopic(id: number) {
    setParams({ theme: String(theme.id), topic: String(id) });
    setDraft(state.writingNotes[`${theme.id}-${id}`] ?? '');
  }

  function saveDraft(value: string) {
    setDraft(value);
    setWritingNote(topicKey, value);
  }

  const checkedCount = topic.itemIds.filter((id) => state.writingChecks[id]).length;

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Writing Practice</h1>
        <p className="mt-1 text-ink-soft">
          Write your own sentences using these collocations, the way you'd use them in a Task 2 essay or Part 3 speaking answer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={theme.id}
          onChange={(e) => selectTheme(Number(e.target.value))}
          className="min-w-0 max-w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          aria-label="Theme"
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <select
          value={topic.id}
          onChange={(e) => selectTopic(Number(e.target.value))}
          className="min-w-0 max-w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          aria-label="Topic"
        >
          {theme.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
        <p className="text-sm font-semibold text-brand-700">Prompt</p>
        <p className="mt-1 text-sm text-ink">
          Write 3–5 sentences giving your opinion on <strong>{topic.title.toLowerCase()}</strong>. Try to naturally
          use at least 4 of the collocations below — tick each one off as you use it correctly.
        </p>
      </div>

      <textarea
        value={draft}
        onChange={(e) => saveDraft(e.target.value)}
        rows={6}
        placeholder="Start writing here… (autosaved)"
        className="w-full rounded-xl border border-line bg-surface p-4 text-sm outline-none focus:border-brand-500"
      />

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Collocations to use</h2>
          <span className="text-xs text-ink-soft">{checkedCount}/10 used</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {topic.itemIds.map((id) => {
            const item = ITEM_BY_ID[id];
            const checked = !!state.writingChecks[id];
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                  checked ? 'border-mint-500 bg-mint-100' : 'border-line bg-surface hover:border-brand-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleWritingCheck(id)}
                  className="mt-0.5 h-4 w-4 accent-mint-500"
                />
                <span>
                  <span className="font-medium">{item.term}</span>{' '}
                  <span className="text-ink-soft">— {item.usage}</span>
                  <br />
                  <span className="text-xs text-ink-soft">{item.meaning}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
