import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SynScopePicker } from '../components/SynScopePicker';
import { buildQuiz, type Question, type QuestionKind } from '../lib/synonyms';
import { useSynState } from '../lib/synState';
import { useSynScope } from '../lib/useSynScope';

type QuizKind = 'mixed' | QuestionKind;

const KINDS: { key: QuizKind; label: string; blurb: string }[] = [
  { key: 'mixed', label: 'Mixed', blurb: 'A bit of everything' },
  { key: 'cloze', label: 'Upgrade the word', blurb: 'Fill the gap with the best upgrade' },
  { key: 'nuance', label: 'Match the meaning', blurb: 'Which word fits this description?' },
  { key: 'context', label: 'Context challenge', blurb: 'Tricky: the right word for the situation' },
];

export function SynQuiz() {
  const scope = useSynScope();
  const [kind, setKind] = useState<QuizKind>('mixed');
  const [length, setLength] = useState(10);
  const [round, setRound] = useState<number | null>(null);

  const scopeKey = scope.words?.join(',') ?? 'all';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const available = useMemo(() => buildQuiz(kind, 999, { words: scope.words }).length, [kind, scopeKey]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Synonym quiz</h1>
        <p className="mt-1 text-ink-soft">Choose the word that fits. Every answer comes with a short explanation.</p>
      </header>

      {round === null ? (
        <>
          <SynScopePicker available={available} />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Question type</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => setKind(k.key)}
                  aria-pressed={kind === k.key}
                  className={`rounded-xl border p-3 text-left transition ${
                    kind === k.key ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface hover:border-brand-300'
                  }`}
                >
                  <p className="font-semibold">{k.label}</p>
                  <p className="text-sm text-ink-soft">{k.blurb}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Length</p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setLength(n)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    length === n ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft'
                  }`}
                >
                  {n} questions
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setRound(Date.now())}
            disabled={available === 0}
            className="self-start rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
          >
            Start quiz
          </button>
          {available === 0 && <p className="text-sm text-ink-soft">No questions in this set. Try “Mixed” or a wider scope.</p>}
        </>
      ) : (
        <Runner key={round} kind={kind} length={length} onDone={() => setRound(null)} />
      )}
    </div>
  );
}

function Runner({ kind, length, onDone }: { kind: QuizKind; length: number; onDone: () => void }) {
  const scope = useSynScope();
  const syn = useSynState();
  const [questions] = useState<Question[]>(() => buildQuiz(kind, length, { words: scope.words }));
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [wrong, setWrong] = useState<Question[]>([]);
  const [score, setScore] = useState(0);
  const logged = useRef(false);

  const q = questions[i];
  const done = i >= questions.length;

  function choose(option: string) {
    if (choice !== null || !q) return;
    setChoice(option);
    const ok = option === q.answer;
    syn.record(q.n, ok);
    if (ok) setScore((s) => s + 1);
    else setWrong((w) => [...w, q]);
  }

  function next() {
    setChoice(null);
    setI((x) => x + 1);
  }

  useEffect(() => {
    if (done && !logged.current && questions.length) {
      logged.current = true;
      syn.logAttempt({ mode: 'quiz', correct: score, total: questions.length, at: Date.now() });
    }
    // log once when the quiz ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || !q) return;
      const el = e.target as HTMLElement;
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return;
      const idx = Number(e.key) - 1;
      if (choice === null && idx >= 0 && idx < q.options.length) choose(q.options[idx]);
      else if (choice !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        No questions for this selection.{' '}
        <button onClick={onDone} className="font-medium text-brand-600 hover:underline">
          Change the settings
        </button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-3xl">{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</p>
          <h2 className="mt-2 text-xl font-bold">
            {score} / {questions.length} ({pct}%)
          </h2>
          <p className="mt-1 text-ink-soft">
            {pct >= 80 ? 'Excellent. These upgrades are becoming natural.' : pct >= 50 ? 'Good progress. Review the ones you missed.' : 'Keep going. Study the word pages, then try again.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <button onClick={onDone} className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
              Another quiz
            </button>
            <Link to="/synonyms/timed" className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
              Try a timed test
            </Link>
          </div>
        </div>
        {wrong.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold">Review your misses</h3>
            <ul className="flex flex-col gap-3">
              {wrong.map((w) => (
                <li key={w.id} className="rounded-xl border border-line bg-surface p-4 text-sm shadow-sm">
                  <p className="font-medium">{w.stem}</p>
                  <p className="mt-1 text-mint-ink">Answer: {w.answer}</p>
                  <p className="mt-1 text-ink-soft">{w.why}</p>
                  <Link to={`/synonyms/word/${w.n}`} className="mt-1 inline-block font-medium text-brand-600 hover:underline">
                    Study this word →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const answered = choice !== null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Question {i + 1} of {questions.length}
        </span>
        <span>Score {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-brand-50">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{q.prompt}</p>
        <p className="mt-3 text-xl leading-relaxed">{q.stem}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, idx) => {
          const isAnswer = o === q.answer;
          const isChoice = o === choice;
          const style = !answered
            ? 'border-line bg-surface hover:border-brand-300'
            : isAnswer
              ? 'border-mint-ink bg-mint-100 text-mint-ink'
              : isChoice
                ? 'border-rose-ink bg-rose-100 text-rose-ink'
                : 'border-line bg-surface opacity-60';
          return (
            <button
              key={o}
              onClick={() => choose(o)}
              disabled={answered}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium transition ${style}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {idx + 1}
              </span>
              {o}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`rounded-xl p-4 text-sm ${choice === q.answer ? 'bg-mint-100 text-mint-ink' : 'bg-amber-100 text-amber-ink'}`} role="status">
          <p className="font-semibold">{choice === q.answer ? 'Correct!' : `Not quite. The answer is “${q.answer}”.`}</p>
          <p className="mt-1">{q.why}</p>
          <button onClick={next} className="mt-3 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600">
            {i + 1 === questions.length ? 'See results' : 'Next'} <span className="opacity-70">(Enter)</span>
          </button>
        </div>
      )}
    </div>
  );
}
