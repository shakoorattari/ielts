import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { overallBand, formatBand } from '../lib/bands';
import { ALL_ITEMS } from '../lib/collocations';
import { useLabState } from '../lib/labState';
import { PROMPTS, pick } from '../lib/synonyms';
import { CRITERIA, MIN_WORDS_TASK2, analyzeWriting, wordsOf } from '../lib/writingAnalysis';
import type { Note } from '../lib/writingAnalysis';

const EXAM_SECONDS = 40 * 60;

const TYPE_LABEL: Record<string, string> = {
  'agree-or-disagree': 'Agree or disagree',
  'discuss-both-views': 'Discuss both views',
  'advantages-disadvantages': 'Advantages and disadvantages',
  'cause-effect-solution': 'Causes, effects and solutions',
  combination: 'Two-part question',
};

/** What each level looks like, in plain words, paraphrasing the public IELTS Writing Task 2 band descriptors. */
const DESCRIPTORS: Record<(typeof CRITERIA)[number], Record<number, string>> = {
  'Task Response': {
    4: 'Only touches on the question; the position is unclear or hard to find.',
    5: 'Answers only part of the question. The opinion is unclear or not developed, and ideas are limited or repeated.',
    6: 'Answers every part, some more fully than others. The position is relevant but the conclusion may be unclear. Ideas are extended but not always supported.',
    7: 'Answers every part with a clear position throughout. Main ideas are extended and supported, though some may be over-general.',
    8: 'Answers every part fully. Ideas are relevant, well developed and clearly supported.',
    9: 'Fully and fluently answers the question with a fully developed position and no lapses.',
  },
  'Coherence and Cohesion': {
    4: 'Ideas are not clearly arranged; linking is basic or faulty.',
    5: 'Some organisation but little overall progression. Linking words are mechanical, over-used or wrong. Paragraphing may be weak.',
    6: 'Information flows with a clear overall progression. Linking words are used, but sometimes mechanically, and referencing is not always clear.',
    7: 'Logical progression throughout with a range of linking devices. Each paragraph has a clear central topic. Some under- or over-use of links.',
    8: 'Ideas are sequenced logically and cohesion is managed well. Paragraphing is appropriate.',
    9: 'Cohesion is so natural that it does not draw attention. Paragraphing is faultless.',
  },
  'Lexical Resource': {
    4: 'Basic vocabulary, repeated often; errors make meaning hard to follow.',
    5: 'Limited range, only just adequate. Noticeable spelling or word-form errors can make reading harder.',
    6: 'Adequate range. You try less common words with some inaccuracy. Errors do not stop the reader understanding.',
    7: 'Enough range for flexibility and precision, with some awareness of style and collocation. Occasional slips in word choice or spelling.',
    8: 'A wide range used fluently and precisely, including uncommon words. Only occasional errors in word choice or collocation.',
    9: 'Full flexibility and precision with natural, sophisticated vocabulary. Slips are very rare.',
  },
  'Grammatical Range and Accuracy': {
    4: 'Mostly simple sentences with frequent errors that make meaning hard to follow.',
    5: 'Limited range. Complex sentences are attempted but less accurate than simple ones, and errors are frequent.',
    6: 'A mix of simple and complex sentences. Errors in grammar and punctuation appear but rarely stop understanding.',
    7: 'A variety of complex structures. Many sentences are error-free, with a few persistent errors.',
    8: 'A wide range of structures. Most sentences are error-free; slips are occasional.',
    9: 'Full range of structures used naturally and accurately. Slips are very rare.',
  },
};
const LEVELS = [4, 5, 6, 7, 8, 9];
const LEVEL_NAME = (l: number) => (l === 4 ? 'Band 4 or below' : `Band ${l}`);

const toneClass: Record<Note['tone'], string> = {
  good: 'border-mint-500/40 bg-mint-100 text-mint-ink',
  warn: 'border-amber-500/40 bg-amber-100 text-amber-ink',
  info: 'border-line bg-canvas text-ink-soft',
};
const toneIcon: Record<Note['tone'], string> = { good: '✓', warn: '!', info: 'i' };

const fmtClock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function WritingLab() {
  const lab = useLabState();
  const { state } = lab;
  const [typeFilter, setTypeFilter] = useState('');
  const [saved, setSaved] = useState(false);

  const prompt = PROMPTS.find((p) => p.n === state.promptN) ?? null;
  const question = state.promptN === 0 ? state.customPrompt : (prompt?.q ?? '');

  const deferred = useDeferredValue(state.text);
  const analysis = useMemo(() => analyzeWriting(deferred, ALL_ITEMS), [deferred]);
  const liveWords = wordsOf(state.text).length;

  function newQuestion() {
    const pool = typeFilter ? PROMPTS.filter((p) => p.type === typeFilter) : PROMPTS;
    const others = pool.filter((p) => p.n !== state.promptN);
    lab.setPrompt(pick(others.length ? others : pool).n);
  }

  const rated = CRITERIA.every((c) => state.ratings[c]);
  const estimate = rated ? overallBand(CRITERIA.map((c) => state.ratings[c])) : null;

  function save() {
    lab.saveAttempt({ promptN: state.promptN, words: liveWords, band: estimate });
    setSaved(true);
  }
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Writing lab</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Practise a full Task 2 essay in exam conditions. Your draft is checked instantly for length, structure, linking
          words, repetition, informal wording and the collocations you used. The checks are mechanical and cannot judge
          your ideas, so finish by rating yourself honestly against the four marking criteria.
        </p>
      </div>

      <section aria-labelledby="q-h" className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="q-h" className="mr-auto text-sm font-semibold text-brand-700">
            Essay question
          </h2>
          <label htmlFor="type-filter" className="sr-only">
            Question type
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">All question types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button onClick={newQuestion} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-on-brand hover:bg-brand-600">
            {state.promptN === 0 && !state.customPrompt ? 'Give me a question' : 'Another question'}
          </button>
          <button
            onClick={() => lab.setPrompt(0)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand-300"
          >
            Type my own
          </button>
        </div>
        {state.promptN === 0 ? (
          <>
            <label htmlFor="custom-q" className="sr-only">
              Your essay question
            </label>
            <textarea
              id="custom-q"
              value={state.customPrompt}
              onChange={(e) => lab.setCustomPrompt(e.target.value)}
              rows={2}
              placeholder="Paste or type an essay question, or press “Give me a question”."
              className="mt-3 w-full rounded-lg border border-line bg-surface p-3 text-sm outline-none focus:border-brand-500"
            />
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink" data-testid="question">
            {question}
            {prompt && <span className="mt-1 block text-xs text-ink-soft">{TYPE_LABEL[prompt.type] ?? prompt.type}</span>}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="draft-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="draft-h" className="mr-auto text-lg font-semibold">
              Your essay
            </h2>
            <Timer />
            <p className={`text-sm font-semibold ${liveWords >= MIN_WORDS_TASK2 ? 'text-mint-ink' : 'text-ink-soft'}`} aria-live="polite" data-testid="word-count">
              {liveWords} / {MIN_WORDS_TASK2} words
            </p>
          </div>
          <label htmlFor="essay" className="sr-only">
            Write your essay here
          </label>
          <textarea
            id="essay"
            value={state.text}
            onChange={(e) => lab.setText(e.target.value)}
            rows={18}
            spellCheck
            placeholder={'Write your essay here. Leave a blank line between paragraphs. (Autosaved in this browser only.)'}
            className="w-full rounded-xl border border-line bg-surface p-4 text-[15px] leading-relaxed outline-none focus:border-brand-500"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void navigator.clipboard?.writeText(state.text)}
              disabled={!state.text}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand-300 disabled:opacity-50"
            >
              Copy text
            </button>
            <button
              onClick={() => {
                if (!state.text || window.confirm('Clear your essay and ratings? This cannot be undone.')) lab.clearDraft();
              }}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-rose-500"
            >
              Clear
            </button>
            <Link to="/synonyms/scanner" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand-300">
              Check plain words →
            </Link>
          </div>
        </section>

        <aside aria-labelledby="check-h" className="flex flex-col gap-4">
          <h2 id="check-h" className="text-lg font-semibold">
            Instant checks
          </h2>
          {analysis.words === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">Start writing and the checks appear here.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2 text-center">
                <Stat label="Words" value={analysis.words} />
                <Stat label="Paragraphs" value={analysis.paragraphs} />
                <Stat label="Sentences" value={analysis.sentences} />
                <Stat label="Avg. sentence" value={`${analysis.avgSentenceWords}`} />
              </dl>
              <ul className="flex flex-col gap-2" data-testid="notes">
                {analysis.notes.map((n, i) => (
                  <li key={i} className={`flex gap-2 rounded-xl border p-3 text-sm ${toneClass[n.tone]}`}>
                    <span aria-hidden className="font-bold">
                      {toneIcon[n.tone]}
                    </span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
              <Details title="Linking words used" empty="None found yet.">
                {analysis.linking
                  .filter((c) => c.used.length)
                  .map((c) => (
                    <p key={c.category} className="text-sm">
                      <span className="font-medium">{c.category}: </span>
                      {c.used.map((u) => `${u.phrase}${u.count > 1 ? ` ×${u.count}` : ''}`).join(', ')}
                    </p>
                  ))}
              </Details>
              <Details title="Informal or vague wording" empty="None found.">
                {analysis.informal.map((h) => (
                  <p key={h.word} className="text-sm">
                    <strong>{h.word}</strong>
                    {h.count > 1 && ` ×${h.count}`} → {h.suggestion}
                  </p>
                ))}
              </Details>
              <Details title="Repeated words" empty="No word is repeated four or more times.">
                {analysis.repeats.map((r) => (
                  <p key={r.word} className="text-sm">
                    <strong>{r.word}</strong> ×{r.count}
                  </p>
                ))}
              </Details>
              <Details title={`Collocations used (${analysis.collocations.length})`} empty="None from the 1000-collocation list yet. Try the Collocations section.">
                <ul className="flex flex-wrap gap-1.5">
                  {analysis.collocations.map((c) => (
                    <li key={c.id} title={c.meaning} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                      {c.term}
                    </li>
                  ))}
                </ul>
              </Details>
            </>
          )}
        </aside>
      </div>

      <section aria-labelledby="self-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 id="self-h" className="text-lg font-semibold">
          Rate yourself like an examiner
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Choose the description that best fits your essay on each criterion. Be strict: pick the lower level when you are
          unsure. The four criteria carry equal weight.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CRITERIA.map((c) => {
            const level = state.ratings[c];
            return (
              <div key={c} className="flex flex-col gap-2">
                <label htmlFor={`rate-${c}`} className="text-sm font-semibold">
                  {c}
                </label>
                <select
                  id={`rate-${c}`}
                  value={level ?? ''}
                  onChange={(e) => lab.setRating(c, Number(e.target.value))}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Choose a level…
                  </option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_NAME(l)}
                    </option>
                  ))}
                </select>
                <p className="min-h-10 text-xs text-ink-soft">{level ? DESCRIPTORS[c][level] : 'Pick a level to read what it looks like.'}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm" aria-live="polite" data-testid="estimate">
            {estimate === null ? 'Rate all four criteria to see your self-assessed band.' : <>Self-assessed Writing band: <strong className="text-xl text-brand-500">{formatBand(estimate)}</strong></>}
          </p>
          <button
            onClick={save}
            disabled={liveWords === 0}
            className="ml-auto rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-600 disabled:opacity-50"
          >
            {saved ? 'Saved ✓' : 'Save this attempt'}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          A self-assessment is a study aid, not a prediction. Real marking is done by trained examiners, and most learners
          rate themselves higher than an examiner would.
        </p>
      </section>

      {state.attempts.length > 0 && (
        <section aria-labelledby="hist-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 id="hist-h" className="text-lg font-semibold">
            Saved attempts
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {[...state.attempts].reverse().map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-ink-soft">{new Date(a.at).toLocaleDateString()}</span>
                <span>{a.words} words</span>
                <span className="font-medium">{a.band === null ? 'not rated' : `band ${formatBand(a.band)}`}</span>
                <button
                  onClick={() => lab.deleteAttempt(a.id)}
                  className="ml-auto rounded px-2 py-1 text-xs text-ink-soft hover:text-rose-ink"
                  aria-label={`Delete attempt from ${new Date(a.at).toLocaleDateString()}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

function Details({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <details className="rounded-xl border border-line bg-surface p-3" open>
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <div className="mt-2 flex flex-col gap-1">{hasContent ? children : <p className="text-sm text-ink-soft">{empty}</p>}</div>
    </details>
  );
}

/** A 40-minute exam countdown. It never stops the writing; it only shows the time. */
function Timer() {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(EXAM_SECONDS);
  const endRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.round((endRef.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setRemaining(0);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  function toggle() {
    if (running) {
      setRunning(false);
    } else {
      endRef.current = Date.now() + (remaining > 0 ? remaining : EXAM_SECONDS) * 1000;
      if (remaining <= 0) setRemaining(EXAM_SECONDS);
      setRunning(true);
    }
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="40 minute timer">
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${remaining <= 300 && running ? 'text-rose-ink' : ''}`}
        role="timer"
        aria-live="off"
        data-testid="clock"
      >
        {fmtClock(Math.max(0, remaining))}
      </span>
      <button onClick={toggle} className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold hover:border-brand-300">
        {running ? 'Pause' : remaining === EXAM_SECONDS || remaining <= 0 ? 'Start 40:00' : 'Resume'}
      </button>
      <button
        onClick={() => {
          setRunning(false);
          setRemaining(EXAM_SECONDS);
        }}
        className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold hover:border-brand-300"
      >
        Reset
      </button>
    </div>
  );
}
