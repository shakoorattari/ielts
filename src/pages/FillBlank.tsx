import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_ITEMS, THEMES, blankExample, shuffle } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import { isCloseEnough } from '../lib/match';
import type { Item } from '../types';

const ROUND_SIZE = 10;

function buildRound(themeId: number | null): Item[] {
  const scoped = themeId ? ALL_ITEMS.filter((i) => i.themeId === themeId) : ALL_ITEMS;
  const eligible = scoped.filter((i) => blankExample(i) !== null);
  return shuffle(eligible).slice(0, ROUND_SIZE);
}

type Phase = 'answering' | 'checked';

export function FillBlank() {
  const [params, setParams] = useSearchParams();
  const themeId = params.get('theme') ? Number(params.get('theme')) : null;
  const { recordResult } = useProgress();

  const [round, setRound] = useState<Item[]>(() => buildRound(themeId));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [wasCorrect, setWasCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [hintLevel, setHintLevel] = useState(0);

  const item = round[index];
  const blank = useMemo(() => (item ? blankExample(item) : null), [item]);

  function restart(nextTheme: number | null) {
    setParams(nextTheme ? { theme: String(nextTheme) } : {});
    setRound(buildRound(nextTheme));
    setIndex(0);
    setAnswer('');
    setPhase('answering');
    setScore({ correct: 0, total: 0 });
    setHintLevel(0);
  }

  function submit() {
    if (!item || !answer.trim()) return;
    const lenientCorrect = isCloseEnough(answer, item.usage);
    setWasCorrect(lenientCorrect);
    recordResult(item.id, lenientCorrect && hintLevel === 0);
    setScore((s) => ({ correct: s.correct + (lenientCorrect ? 1 : 0), total: s.total + 1 }));
    setPhase('checked');
  }

  function next() {
    setAnswer('');
    setHintLevel(0);
    setPhase('answering');
    setIndex((i) => i + 1);
  }

  const finished = !item;
  const hint = item ? item.usage.slice(0, hintLevel) : '';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fill the Blank</h1>
        <select
          value={themeId ?? ''}
          onChange={(e) => restart(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">All themes</option>
          {THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {!finished && (
        <p className="text-sm text-ink-soft">
          Question {index + 1} of {round.length} · Score {score.correct}/{score.total}
        </p>
      )}

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-3xl">{score.correct === round.length ? '🏆' : '✅'}</p>
          <p className="text-lg font-semibold">
            Round complete — {score.correct}/{round.length} correct
          </p>
          <button
            onClick={() => restart(themeId)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            New round
          </button>
        </div>
      ) : blank ? (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            {item.themeTitle} · {item.topicTitle}
          </p>
          <p className="mt-3 text-lg leading-relaxed">
            {blank.before}
            <span className="mx-1 inline-block min-w-32 border-b-2 border-dashed border-brand-500 px-1 text-center font-semibold text-brand-600">
              {phase === 'checked' ? item.usage : answer || '＿＿＿＿＿＿'}
            </span>
            {blank.after}
          </p>
          <p className="mt-2 text-xs text-ink-soft">Meaning: {item.meaning}</p>

          {phase === 'answering' ? (
            <div className="mt-5 flex flex-col gap-2">
              <input
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Type the missing collocation…"
                className="rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              {hintLevel > 0 && (
                <p className="text-xs text-ink-soft">
                  Hint: <span className="font-mono">{hint}…</span>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Check
                </button>
                <button
                  onClick={() => setHintLevel((h) => Math.min(item.usage.length, h + 3))}
                  className="rounded-lg border border-line px-4 text-sm font-semibold hover:bg-brand-50"
                >
                  Hint
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  wasCorrect ? 'bg-mint-100 text-mint-500' : 'bg-rose-100 text-rose-500'
                }`}
              >
                {wasCorrect ? 'Correct!' : `Not quite — correct answer: "${item.usage}"`}
                {hintLevel > 0 && wasCorrect && ' (hint used — marked for more practice)'}
              </div>
              <p className="text-sm italic text-ink-soft">“{item.example}”</p>
              <button
                onClick={next}
                className="self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
