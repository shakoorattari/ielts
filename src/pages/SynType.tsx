import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpeakButton } from '../components/SpeakButton';
import { SynScopePicker } from '../components/SynScopePicker';
import { fillCloze, shuffle, typedItems, type TypedItem, WORD_BY_N } from '../lib/synonyms';
import { useSynState } from '../lib/synState';
import { useSynScope } from '../lib/useSynScope';
import { isCloseEnough, normalizeAnswer } from '../lib/match';

type Result =
  | { kind: 'right'; typed: string; exact: boolean }
  | { kind: 'sibling'; typed: string; other: string }
  | { kind: 'wrong'; typed: string };

export function SynType() {
  const scope = useSynScope();
  const [round, setRound] = useState<number | null>(null);
  const [length, setLength] = useState(10);
  const available = typedItems({ words: scope.words }).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Type it from memory</h1>
        <p className="mt-1 text-ink-soft">
          Read the sentence and type the upgrade that fits. Small typos are forgiven. Typing builds recall far better
          than recognising.
        </p>
      </header>
      {round === null ? (
        <>
          <SynScopePicker available={available} />
          <div className="flex flex-wrap gap-2">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setLength(n)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  length === n ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft'
                }`}
              >
                {n} sentences
              </button>
            ))}
          </div>
          <button
            onClick={() => setRound(Date.now())}
            disabled={available === 0}
            className="self-start rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
          >
            Start
          </button>
        </>
      ) : (
        <Runner key={round} length={length} onDone={() => setRound(null)} />
      )}
    </div>
  );
}

function Runner({ length, onDone }: { length: number; onDone: () => void }) {
  const scope = useSynScope();
  const syn = useSynState();
  const [items] = useState<TypedItem[]>(() => shuffle(typedItems({ words: scope.words })).slice(0, length));
  const [i, setI] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const logged = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = items[i];
  const done = i >= items.length;

  useEffect(() => {
    if (!result) inputRef.current?.focus();
  }, [i, result]);

  useEffect(() => {
    if (done && !logged.current && items.length) {
      logged.current = true;
      syn.logAttempt({ mode: 'type', correct: score, total: items.length, at: Date.now() });
    }
    // log once when the round ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function check() {
    if (!item || result || !value.trim()) return;
    const typed = value.trim();
    const hit = item.accept.find((a) => isCloseEnough(typed, a, 0.84));
    if (hit) {
      setResult({ kind: 'right', typed, exact: normalizeAnswer(typed) === normalizeAnswer(hit) });
      setScore((s) => s + 1);
      syn.record(item.n, true);
      return;
    }
    const sibling = WORD_BY_N[item.n].syns.find((s) => isCloseEnough(typed, s.w, 0.84));
    setResult(sibling ? { kind: 'sibling', typed, other: sibling.w } : { kind: 'wrong', typed });
    syn.record(item.n, false);
  }

  function next() {
    setResult(null);
    setValue('');
    setHint(false);
    setI((x) => x + 1);
  }

  if (items.length === 0) return <p className="text-ink-soft">No sentences in this set.</p>;

  if (done) {
    const pct = Math.round((score / items.length) * 100);
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-3xl">{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</p>
        <h2 className="mt-2 text-xl font-bold">
          {score} / {items.length} correct
        </h2>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={onDone} className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
            Go again
          </button>
          <Link to="/synonyms/rewrite" className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
            Rewrite drills
          </Link>
        </div>
      </div>
    );
  }

  const parts = item.cloze.split('___');
  const first = item.accept[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Sentence {i + 1} of {items.length}
        </span>
        <span>Score {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-brand-50">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(i / items.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Upgrade for “{item.base}”
        </p>
        <p className="mt-3 text-xl leading-relaxed">
          {parts[0]}
          <span className="mx-1 inline-block min-w-20 border-b-2 border-brand-500 text-center text-brand-600">
            {result ? (result.kind === 'right' ? result.typed : ' ') : hint ? `${first[0]}…` : ' '}
          </span>
          {parts[1]}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (result) next();
          else check();
        }}
        className="flex flex-col gap-3"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={!!result}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Type the upgrade…"
          aria-label="Your answer"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg outline-none focus:border-brand-500"
        />
        {!result ? (
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!value.trim()} className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40">
              Check
            </button>
            {!hint && (
              <button type="button" onClick={() => setHint(true)} className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-brand-300">
                Hint
              </button>
            )}
            <button type="button" onClick={() => { syn.record(item.n, false); setResult({ kind: 'wrong', typed: '' }); }} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft hover:underline">
              Show answer
            </button>
          </div>
        ) : (
          <div
            role="status"
            className={`rounded-xl p-4 text-sm ${result.kind === 'right' ? 'bg-mint-100 text-mint-ink' : 'bg-amber-100 text-amber-ink'}`}
          >
            <p className="font-semibold">
              {result.kind === 'right'
                ? result.exact
                  ? 'Correct!'
                  : `Correct. (Spelled “${first}” in the guide.)`
                : result.kind === 'sibling'
                  ? `“${result.other}” is another upgrade for “${item.base}”, but it doesn’t fit this sentence.`
                  : 'Not this time.'}
            </p>
            <p className="mt-1">
              Fits: <strong>{item.accept.join(', ')}</strong>
            </p>
            <p className="mt-1 flex items-center gap-1">
              {fillCloze(item.cloze, first)}
              <SpeakButton text={fillCloze(item.cloze, first)} />
            </p>
            <button type="submit" className="mt-3 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600">
              {i + 1 === items.length ? 'See results' : 'Next'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
