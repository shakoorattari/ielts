import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_ITEMS, ITEM_BY_ID, THEMES, blankExample, shuffle } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import { useSessionStorage } from '../lib/useSessionStorage';
import { isCloseEnough } from '../lib/match';

const ROUND_SIZE = 10;

function buildRoundIds(themeId: number | null): string[] {
  const scoped = themeId ? ALL_ITEMS.filter((i) => i.themeId === themeId) : ALL_ITEMS;
  const eligible = scoped.filter((i) => blankExample(i) !== null);
  return shuffle(eligible)
    .slice(0, ROUND_SIZE)
    .map((i) => i.id);
}

/** Reveals whole words left-to-right; words not yet revealed show as underscores matching their length. */
function hintDisplay(answer: string, wordsRevealed: number): string {
  return answer
    .split(' ')
    .map((word, i) => (i < wordsRevealed ? word : '_'.repeat(word.length)))
    .join(' ');
}

type Phase = 'answering' | 'checked';

interface FillBlankSession {
  themeId: number | null;
  itemIds: string[];
  index: number;
  answer: string;
  phase: Phase;
  wasCorrect: boolean;
  hintWords: number;
  score: { correct: number; total: number };
  attemptLogged: boolean;
}

function createSession(themeId: number | null): FillBlankSession {
  return {
    themeId,
    itemIds: buildRoundIds(themeId),
    index: 0,
    answer: '',
    phase: 'answering',
    wasCorrect: false,
    hintWords: 0,
    score: { correct: 0, total: 0 },
    attemptLogged: false,
  };
}

export function FillBlank() {
  const [params, setParams] = useSearchParams();
  const themeId = params.get('theme') ? Number(params.get('theme')) : null;
  const { recordResult, logAttempt } = useProgress();

  const [session, setSession] = useSessionStorage<FillBlankSession>('fill-blank', () => createSession(themeId));

  const item = session.itemIds[session.index] ? ITEM_BY_ID[session.itemIds[session.index]] : undefined;
  const blank = useMemo(() => (item ? blankExample(item) : null), [item]);
  const answerWordCount = blank ? blank.answer.split(' ').length : 0;

  function restart(nextTheme: number | null) {
    setParams(nextTheme ? { theme: String(nextTheme) } : {});
    setSession(createSession(nextTheme));
  }

  function submit() {
    if (!item || !blank || !session.answer.trim()) return;
    const lenientCorrect = isCloseEnough(session.answer, blank.answer);
    recordResult(item.id, lenientCorrect && session.hintWords === 0);
    setSession((s) => ({
      ...s,
      wasCorrect: lenientCorrect,
      phase: 'checked',
      score: { correct: s.score.correct + (lenientCorrect ? 1 : 0), total: s.score.total + 1 },
    }));
  }

  function next() {
    setSession((s) => ({ ...s, index: s.index + 1, answer: '', hintWords: 0, phase: 'answering' }));
  }

  const finished = !item;
  const round = session.itemIds;

  useEffect(() => {
    if (finished && !session.attemptLogged && session.score.total > 0) {
      logAttempt({
        mode: 'fill-blank',
        themeId: session.themeId,
        total: session.score.total,
        correct: session.score.correct,
      });
      setSession((s) => ({ ...s, attemptLogged: true }));
    }
  }, [finished, session.attemptLogged, session.score, session.themeId, logAttempt, setSession]);

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
          Question {session.index + 1} of {round.length} · Score {session.score.correct}/{session.score.total}
        </p>
      )}

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-3xl">{session.score.correct === round.length ? '🏆' : '✅'}</p>
          <p className="text-lg font-semibold">
            Round complete — {session.score.correct}/{round.length} correct
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
              {session.phase === 'checked' ? blank.answer : session.answer || '＿＿＿＿＿＿'}
            </span>
            {blank.after}
          </p>
          <p className="mt-2 text-xs text-ink-soft">Meaning: {item.meaning}</p>

          {session.phase === 'answering' ? (
            <div className="mt-5 flex flex-col gap-2">
              <input
                autoFocus
                value={session.answer}
                onChange={(e) => setSession((s) => ({ ...s, answer: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Type the missing word or phrase…"
                className="rounded-lg border border-line px-4 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              {session.hintWords > 0 && (
                <p className="text-xs text-ink-soft">
                  Hint:{' '}
                  <span className="font-mono tracking-wide">{hintDisplay(blank.answer, session.hintWords)}</span>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={!session.answer.trim()}
                  className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Check
                </button>
                <button
                  onClick={() => setSession((s) => ({ ...s, hintWords: Math.min(answerWordCount, s.hintWords + 1) }))}
                  disabled={session.hintWords >= answerWordCount}
                  className="rounded-lg border border-line px-4 text-sm font-semibold hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Hint
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  session.wasCorrect ? 'bg-mint-100 text-mint-500' : 'bg-rose-100 text-rose-500'
                }`}
              >
                {session.wasCorrect ? 'Correct!' : `Not quite — correct answer: "${blank.answer}"`}
                {session.hintWords > 0 && session.wasCorrect && ' (hint used — marked for more practice)'}
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
