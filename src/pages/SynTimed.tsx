import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HighlightedText } from '../components/HighlightedText';
import { AiTextReview } from '../components/AiCoach';
import { PROMPTS, WORDS, WORD_BY_N, analyze, pick, upgradeVerdict, type EssayPrompt } from '../lib/synonyms';
import { MY_LIST_MAX, useSynState } from '../lib/synState';

const TYPE_LABEL: Record<string, string> = {
  'agree-or-disagree': 'Agree or disagree',
  'discuss-both-views': 'Discuss both views',
  'advantages-and-disadvantages': 'Advantages & disadvantages',
  'cause-effect-solution': 'Cause / effect / solution',
  combination: 'Combination',
};
const TYPES = Object.keys(TYPE_LABEL);
const TARGET_WORDS = 250;

export function SynTimed() {
  const [session, setSession] = useState<{ minutes: number; prompt: EssayPrompt | string; targets: number[] } | null>(null);
  const [key, setKey] = useState(0);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Pressure test</h1>
        <p className="mt-1 text-ink-soft">
          Step three of the guide: use your words in timed writing. Pick a real essay question and a handful of target
          words, then write against the clock. Your text stays in your browser.
        </p>
      </header>
      {session === null ? (
        <Setup onStart={(s) => { setSession(s); setKey((k) => k + 1); }} />
      ) : (
        <Writing key={key} {...session} onExit={() => setSession(null)} />
      )}
    </div>
  );
}

function Setup({ onStart }: { onStart: (s: { minutes: number; prompt: EssayPrompt | string; targets: number[] }) => void }) {
  const syn = useSynState();
  const [minutes, setMinutes] = useState(20);
  const [type, setType] = useState('');
  const [prompt, setPrompt] = useState<EssayPrompt>(() => pick(PROMPTS));
  const [custom, setCustom] = useState('');
  const [targets, setTargets] = useState<number[]>(() => syn.state.my.slice(0, MY_LIST_MAX));

  function newPrompt() {
    const pool = type ? PROMPTS.filter((p) => p.type === type) : PROMPTS;
    setPrompt(pick(pool.length ? pool : PROMPTS));
  }

  function toggle(n: number) {
    setTargets((t) => (t.includes(n) ? t.filter((x) => x !== n) : t.length >= MY_LIST_MAX ? t : [...t, n]));
  }

  const chosenPrompt = custom.trim() ? custom.trim() : prompt;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">1. Your question</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Essay type"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option value="">Any essay type</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <button onClick={newPrompt} className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:border-brand-300">
            🎲 New question
          </button>
        </div>
        <p className="mt-3 rounded-xl border-l-4 border-brand-500 bg-brand-50 p-4 italic leading-relaxed">{custom.trim() || prompt.q}</p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-600">Use my own question instead</summary>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            placeholder="Paste an IELTS Task 2 question…"
            className="mt-2 w-full rounded-lg border border-line bg-canvas p-3 outline-none focus:border-brand-500"
          />
        </details>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">2. Your target words</h2>
          <span className="text-sm text-ink-soft">
            {targets.length}/{MY_LIST_MAX} chosen
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Try to use an upgrade for each target naturally. Start with{' '}
          {syn.state.my.length ? 'your own words (preselected)' : 'five that feel natural. You can choose your “starting five” on the Synonyms page'}.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {WORDS.map((w) => {
            const on = targets.includes(w.n);
            return (
              <button
                key={w.n}
                onClick={() => toggle(w.n)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  on ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
                }`}
              >
                {w.word.toLowerCase()}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">3. Your time</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[10, 20, 40, 0].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                minutes === m ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft'
              }`}
            >
              {m === 0 ? 'No timer' : `${m} min`}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">The real Task 2 gives you about 40 minutes. 10 minutes suits one strong paragraph.</p>
      </section>

      <button
        onClick={() => onStart({ minutes, prompt: chosenPrompt, targets })}
        className="self-start rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600"
      >
        Start writing
      </button>
    </div>
  );
}

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

function Writing({
  minutes,
  prompt,
  targets,
  onExit,
}: {
  minutes: number;
  prompt: EssayPrompt | string;
  targets: number[];
  onExit: () => void;
}) {
  const syn = useSynState();
  const [text, setText] = useState('');
  const [finished, setFinished] = useState(false);
  const [start] = useState(() => Date.now());
  const [left, setLeft] = useState(minutes * 60);
  const saved = useRef(false);
  const a = useMemo(() => analyze(text), [text]);
  const used = useMemo(() => new Set(a.upgrades.map((u) => u.n)), [a]);
  const hits = targets.filter((n) => used.has(n));
  const verdict = upgradeVerdict(a.distinctUpgrades);
  const promptText = typeof prompt === 'string' ? prompt : prompt.q;

  function finish() {
    if (finished) return;
    setFinished(true);
    if (!saved.current && a.words > 0) {
      saved.current = true;
      syn.addTimed({
        at: Date.now(),
        minutes: Math.max(1, Math.round((Date.now() - start) / 60000)),
        prompt: typeof prompt === 'string' ? 0 : prompt.n,
        words: a.words,
        targets,
        used: [...used],
        upgrades: a.distinctUpgrades,
      });
      for (const n of used) {
        syn.markLearned(n);
        syn.record(n, true);
      }
      syn.logAttempt({ mode: 'timed', correct: hits.length, total: Math.max(1, targets.length), at: Date.now() });
    }
  }

  // The timer fires from a long-lived interval, so it must call the latest finish(), not a stale copy.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (minutes === 0 || finished) return;
    const end = start + minutes * 60_000;
    const id = window.setInterval(() => {
      const rem = Math.round((end - Date.now()) / 1000);
      setLeft(rem);
      if (rem <= 0) {
        window.clearInterval(id);
        finishRef.current();
      }
    }, 500);
    return () => window.clearInterval(id);
    // re-running on every keystroke would reset the interval, so only restart when the test finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished) {
    return (
      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <p className="text-3xl">{hits.length === targets.length && targets.length > 0 ? '🌟' : '👍'}</p>
          <h2 className="mt-2 text-xl font-bold">
            {targets.length ? `${hits.length} of ${targets.length} target words used` : 'Time’s up'}
          </h2>
          <p className="mt-1 text-ink-soft">
            {a.words} words · {a.distinctUpgrades} distinct upgrade{a.distinctUpgrades === 1 ? '' : 's'}
          </p>
          <p className={`mx-auto mt-3 max-w-md rounded-lg px-3 py-2 text-sm ${a.distinctUpgrades >= 2 && a.distinctUpgrades <= 5 ? 'bg-mint-100 text-mint-ink' : 'bg-amber-100 text-amber-ink'}`}>
            <strong>{verdict.label}.</strong> {verdict.detail}
          </p>
          {a.words < TARGET_WORDS && a.words > 0 && (
            <p className="mt-2 text-xs text-ink-soft">
              Task 2 needs at least {TARGET_WORDS} words. You wrote {a.words}. That’s fine for a paragraph drill.
            </p>
          )}
        </section>

        {targets.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h3 className="font-semibold">Your targets</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {targets.map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <span className={used.has(n) ? 'text-mint-ink' : 'text-amber-ink'}>{used.has(n) ? '✓' : '○'}</span>
                  <span>
                    <strong>{WORD_BY_N[n].word.toLowerCase()}</strong>
                    {used.has(n) ? (
                      <span className="text-ink-soft"> · used {a.upgrades.filter((u) => u.n === n).map((u) => u.syn).join(', ')}</span>
                    ) : (
                      <span className="text-ink-soft"> · try {WORD_BY_N[n].syns.map((s) => s.w).join(', ')}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="font-semibold">Your writing, marked</h3>
          <p className="mt-3 leading-relaxed">
            <HighlightedText text={text} segments={a.segments} />
          </p>
        </section>

        <AiTextReview text={text} label="Get AI feedback on my writing" />

        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={onExit} className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
            Another test
          </button>
          <button onClick={() => navigator.clipboard?.writeText(text)} className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
            Copy my text
          </button>
          {typeof prompt !== 'string' && (
            <Link to={`/essays/${prompt.n}`} className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
              Read a model answer (Essay {prompt.n})
            </Link>
          )}
          <Link to="/synonyms/scanner" className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
            Scan it for more
          </Link>
        </div>
      </div>
    );
  }

  const low = minutes > 0 && left <= 300;
  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 px-4 py-2 shadow-sm backdrop-blur">
        <span className={`font-mono text-xl font-bold ${low ? 'text-rose-ink' : ''}`} aria-live="off">
          {minutes === 0 ? '∞' : mmss(left)}
        </span>
        <span className={`text-sm font-semibold ${a.words >= TARGET_WORDS ? 'text-mint-ink' : 'text-ink-soft'}`}>
          {a.words} / {TARGET_WORDS} words
        </span>
        <button onClick={finish} className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-600">
          Finish
        </button>
      </div>

      <p className="rounded-xl border-l-4 border-brand-500 bg-brand-50 p-4 italic leading-relaxed">{promptText}</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          autoFocus
          aria-label="Your essay"
          placeholder="Start writing. Use your target upgrades where they sound natural."
          className="w-full resize-y rounded-xl border border-line bg-surface p-4 text-[16px] leading-relaxed outline-none focus:border-brand-500"
        />
        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Target words</p>
            {targets.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No targets chosen. Write freely.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {targets.map((n) => (
                  <li key={n}>
                    <p className={used.has(n) ? 'font-semibold text-mint-ink' : 'font-medium'}>
                      {used.has(n) ? '✓' : '○'} {WORD_BY_N[n].word.toLowerCase()}
                    </p>
                    {!used.has(n) && <p className="pl-5 text-xs text-ink-soft">{WORD_BY_N[n].syns.map((s) => s.w).join(' · ')}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Upgrades so far</p>
            <p className="mt-1 font-semibold">{a.distinctUpgrades}</p>
            <p className="text-xs text-ink-soft">Aim for two to five that sound natural.</p>
            {a.overused.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs text-amber-ink">
                Repeating: {a.overused.map((o) => o.word.toLowerCase()).join(', ')}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
