import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpeakButton } from '../components/SpeakButton';
import { SynScopePicker } from '../components/SynScopePicker';
import { allCards, clozeOfSyn, findSpan, shuffle } from '../lib/synonyms';
import { newCardsLeftToday, useSynState } from '../lib/synState';
import { useSynScope } from '../lib/useSynScope';
import type { Grade } from '../types';

const GRADES: { grade: Grade; label: string; tone: string; key: string }[] = [
  { grade: 'again', label: 'Again', tone: 'border-rose-ink text-rose-ink hover:bg-rose-100', key: '1' },
  { grade: 'hard', label: 'Hard', tone: 'border-amber-ink text-amber-ink hover:bg-amber-100', key: '2' },
  { grade: 'good', label: 'Good', tone: 'border-brand-500 text-brand-700 hover:bg-brand-50', key: '3' },
  { grade: 'easy', label: 'Easy', tone: 'border-mint-ink text-mint-ink hover:bg-mint-100', key: '4' },
];

export function SynFlashcards() {
  const scope = useSynScope();
  const [round, setRound] = useState(0);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Synonym flashcards</h1>
        <p className="mt-1 text-ink-soft">
          Read the sentence, recall the upgrade, then grade yourself. Cards you find hard come back sooner.
        </p>
      </header>
      <SynScopePicker />
      <Session key={`${scope.kind}-${scope.topic}-${scope.word}-${scope.words?.join(',')}-${round}`} onRestart={() => setRound((r) => r + 1)} />
    </div>
  );
}

function Session({ onRestart }: { onRestart: () => void }) {
  const scope = useSynScope();
  const syn = useSynState();
  // Build the queue once per session: cards that are due, then a few new ones.
  const [queue] = useState(() => {
    const now = Date.now();
    const s = syn.state;
    const pool = allCards().filter((c) => !scope.words || scope.words.includes(c.word.n));
    const due = pool.filter((c) => s.cards[c.id] && s.cards[c.id].due <= now).sort((a, b) => s.cards[a.id].due - s.cards[b.id].due);
    const fresh = pool.filter((c) => !s.cards[c.id]);
    const cap = scope.kind === 'word' ? fresh.length : newCardsLeftToday(s);
    return [...shuffle(due), ...fresh.slice(0, cap)];
  });

  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [letter, setLetter] = useState(false);
  const [good, setGood] = useState(0);
  const logged = useRef(false);
  const card = queue[index];
  const finished = index >= queue.length;

  const sentence = useMemo(() => (card ? clozeOfSyn(card.syn) : null), [card]);

  function grade(g: Grade) {
    if (!card) return;
    syn.gradeCard(card.id, g);
    syn.record(card.word.n, g !== 'again');
    if (g === 'good' || g === 'easy') syn.markLearned(card.word.n);
    if (g !== 'again') setGood((x) => x + 1);
    setShown(false);
    setLetter(false);
    setIndex((i) => i + 1);
  }

  useEffect(() => {
    if (finished && queue.length > 0 && !logged.current) {
      logged.current = true;
      syn.logAttempt({ mode: 'flashcards', correct: good, total: queue.length, at: Date.now() });
    }
    // log once when the session ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished) return;
      const el = e.target as HTMLElement;
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setShown(true);
      } else if (shown) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) grade(g.grade);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 font-semibold">Nothing to review right now</p>
        <p className="mt-1 text-sm text-ink-soft">
          {scope.kind === 'my' && scope.words?.length === 0
            ? 'Choose your starting words first, then come back.'
            : 'You’ve covered today’s new cards and nothing is due. Try the quiz or a rewrite drill, or come back tomorrow.'}
        </p>
        <div className="mt-4 flex justify-center gap-2 text-sm">
          <Link to="/synonyms/quiz" className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
            Take a quiz
          </Link>
          <Link to="/synonyms" className="rounded-full border border-line px-4 py-2 font-medium">
            Choose words
          </Link>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((good / queue.length) * 100);
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-3xl">{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</p>
        <h2 className="mt-2 text-xl font-bold">Session complete</h2>
        <p className="mt-1 text-ink-soft">
          You recalled {good} of {queue.length} cards ({pct}%).
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={onRestart} className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
            Study more
          </button>
          <Link to="/synonyms/rewrite" className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
            Try a rewrite drill
          </Link>
        </div>
      </div>
    );
  }

  const answer = card.syn.w;
  const span = findSpan(card.syn.ex, answer);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          Upgrade for “{card.word.word.toLowerCase()}”
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-brand-50">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        {sentence ? (
          <p className="text-xl leading-relaxed">
            {shown ? (
              <>
                {card.syn.ex.slice(0, span?.[0] ?? 0)}
                <mark className="rounded bg-brand-100 px-1 font-semibold text-brand-700">{answer}</mark>
                {card.syn.ex.slice(span?.[1] ?? 0)}
              </>
            ) : (
              sentence.split('___').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="mx-1 inline-block min-w-16 border-b-2 border-brand-500 text-center align-baseline text-brand-600">
                      {letter ? `${answer[0]}…` : ' '}
                    </span>
                  )}
                </span>
              ))
            )}
          </p>
        ) : (
          <p className="text-xl leading-relaxed">
            Which upgrade for <strong>{card.word.word.toLowerCase()}</strong> means: “{card.syn.note}”?
          </p>
        )}
        <p className="mt-3 text-sm text-ink-soft">
          Hint: {card.syn.note}. {answer.split(' ').length > 1 ? `${answer.split(' ').length} words.` : `${answer.length} letters.`}
        </p>

        {!shown ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => setShown(true)} className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600">
              Show answer <span className="opacity-70">(space)</span>
            </button>
            {!letter && (
              <button onClick={() => setLetter(true)} className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-brand-300">
                First letter
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{answer}</span>
              <SpeakButton text={card.syn.ex} label="Listen to the sentence" />
            </div>
            {card.syn.use.length > 0 && (
              <p className="text-sm">
                <span className="font-semibold text-ink-soft">Use it like: </span>
                {card.syn.use.join(' · ')}
              </p>
            )}
            {card.syn.hook && (
              <p className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <span className="font-semibold">🧠 </span>
                {card.syn.hook}
              </p>
            )}
            {card.syn.warn && (
              <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-ink">
                <span className="font-semibold">⚠ </span>
                {card.syn.warn}
              </p>
            )}
            <Link to={`/synonyms/word/${card.word.n}`} className="text-xs font-medium text-brand-600 hover:underline">
              Open the “{card.word.word.toLowerCase()}” page →
            </Link>
          </div>
        )}
      </div>

      {shown && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              onClick={() => grade(g.grade)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${g.tone}`}
            >
              {g.label} <span className="text-xs opacity-60">({g.key})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
