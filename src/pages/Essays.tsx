import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ESSAYS, TOPICS, TYPES, matchesQuery, questionText, readMinutes, topicLabel, typeLabel } from '../lib/essays';
import { useEssayState } from '../lib/essayState';
import { SourceCredit } from '../components/SourceCredit';
import { PDF_LABEL, PDF_URL } from '../lib/pdf';

type StatusFilter = 'all' | 'unread' | 'read' | 'saved';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'saved', label: 'Saved' },
];

export function Essays() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, isRead, isSaved } = useEssayState();
  const [query, setQuery] = useState('');

  const type = params.get('type') ?? '';
  const topic = params.get('topic') ?? '';
  const status = (params.get('status') as StatusFilter | null) ?? 'all';

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const results = useMemo(
    () =>
      ESSAYS.filter((e) => {
        if (type && e.type !== type) return false;
        if (topic && !e.topics.includes(topic)) return false;
        if (status === 'read' && !state.read.includes(e.n)) return false;
        if (status === 'unread' && state.read.includes(e.n)) return false;
        if (status === 'saved' && !state.saved.includes(e.n)) return false;
        return matchesQuery(e, query);
      }),
    [type, topic, status, query, state.read, state.saved],
  );

  const filtered = Boolean(type || topic || status !== 'all' || query.trim());

  function randomUnread() {
    const pool = (results.length ? results : ESSAYS).filter((e) => !isRead(e.n));
    const list = pool.length ? pool : results.length ? results : ESSAYS;
    navigate(`/essays/${list[Math.floor(Math.random() * list.length)].n}`);
  }

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model essays</h1>
          <p className="mt-1 text-ink-soft">
            {ESSAYS.length} Task 2 essays with highlighted key phrases and meanings. {state.read.length} read
            {state.saved.length > 0 ? ` · ${state.saved.length} saved` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={PDF_URL}
            download
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm hover:border-brand-300"
            title="Phone-sized PDF of all 202 essays with key-phrase tables"
          >
            ⬇ Download PDF <span className="text-ink-soft">({PDF_LABEL})</span>
          </a>
          <Link
            to="/phrases"
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm hover:border-brand-300"
          >
            Phrase bank
          </Link>
          <button
            onClick={randomUnread}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            🎲 Random essay
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a topic, word or phrase… e.g. “obesity”, “remote work”"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-500"
      />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={!type} onClick={() => setParam('type', '')}>
            All types
          </Chip>
          {TYPES.map((t) => (
            <Chip key={t.key} active={type === t.key} onClick={() => setParam('type', t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={topic}
            onChange={(e) => setParam('topic', e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
            aria-label="Filter by topic"
          >
            <option value="">All topics</option>
            {TOPICS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-full bg-brand-50 p-1 text-sm">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setParam('status', o.key)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  status === o.key ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {filtered && (
            <button
              onClick={() => {
                setQuery('');
                setParams({}, { replace: true });
              }}
              className="text-sm font-medium text-brand-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-ink-soft">
        {results.length} essay{results.length === 1 ? '' : 's'}
      </p>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          No essays match. Try a different word or clear the filters.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((e) => (
            <Link
              key={e.n}
              to={`/essays/${e.n}`}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-500">Essay {e.n}</span>
                <span className="flex items-center gap-2 text-xs font-semibold">
                  {isSaved(e.n) && <span className="text-amber-500">★ Saved</span>}
                  {isRead(e.n) && <span className="rounded-full bg-mint-100 px-2 py-0.5 text-mint-500">✓ Read</span>}
                </span>
              </div>
              <p className="line-clamp-3 text-sm font-medium leading-snug">{questionText(e)}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-soft">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-600">
                  {typeLabel(e.type)}
                </span>
                {e.topics.slice(0, 2).map((t) => (
                  <span key={t} className="rounded-full bg-ink-soft/10 px-2 py-0.5">
                    {topicLabel(t)}
                  </span>
                ))}
                <span className="ml-auto">
                  {e.words} words · {readMinutes(e)} min
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <SourceCredit />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
