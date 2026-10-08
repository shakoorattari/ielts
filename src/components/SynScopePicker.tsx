import { TOPIC_KEYS, TOPIC_LABEL, WORD_BY_N } from '../lib/synonyms';
import { useSynScope } from '../lib/useSynScope';

/** "What to practise": all words, my five, one topic, or a single word. */
export function SynScopePicker({ available }: { available?: number }) {
  const scope = useSynScope();
  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
    }`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => scope.setScope('all')} className={pill(scope.kind === 'all')}>
          All words
        </button>
        <button onClick={() => scope.setScope('my')} className={pill(scope.kind === 'my')}>
          ⭐ My words
        </button>
        <select
          value={scope.kind === 'topic' ? scope.topic : ''}
          onChange={(e) => (e.target.value ? scope.setScope('topic', e.target.value) : scope.setScope('all'))}
          aria-label="Practise one topic"
          className={`min-w-0 max-w-full rounded-full border px-3 py-1.5 text-sm font-medium outline-none ${
            scope.kind === 'topic' ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft'
          }`}
        >
          <option value="">By topic…</option>
          {TOPIC_KEYS.map((t) => (
            <option key={t} value={t}>
              {TOPIC_LABEL[t]}
            </option>
          ))}
        </select>
        {scope.kind === 'word' && scope.word && (
          <button onClick={() => scope.setScope('all')} className={pill(true)}>
            “{WORD_BY_N[scope.word].word}” ✕
          </button>
        )}
      </div>
      {scope.kind === 'my' && scope.words?.length === 0 && (
        <p className="text-sm text-ink-soft">
          You haven’t picked your starting words yet. Open any word and press ☆ “Add to my words”.
        </p>
      )}
      {available !== undefined && <p className="text-xs text-ink-soft">{available} items in this set</p>}
    </div>
  );
}
