import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_ITEMS, ITEM_BY_ID, THEMES, pickDistractorMeanings, shuffle } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import { useSessionStorage } from '../lib/useSessionStorage';

const ROUND_SIZE = 10;

interface QuestionRef {
  itemId: string;
  options: string[];
}

function buildRound(themeId: number | null): QuestionRef[] {
  const scoped = themeId ? ALL_ITEMS.filter((i) => i.themeId === themeId) : ALL_ITEMS;
  const items = shuffle(scoped).slice(0, ROUND_SIZE);
  return items.map((item) => ({
    itemId: item.id,
    options: shuffle([item.meaning, ...pickDistractorMeanings(item, 3)]),
  }));
}

interface QuizSession {
  themeId: number | null;
  questions: QuestionRef[];
  index: number;
  picked: string | null;
  submitted: string | null;
  score: number;
  attemptLogged: boolean;
}

function createSession(themeId: number | null): QuizSession {
  return {
    themeId,
    questions: buildRound(themeId),
    index: 0,
    picked: null,
    submitted: null,
    score: 0,
    attemptLogged: false,
  };
}

export function MultipleChoice() {
  const [params, setParams] = useSearchParams();
  const themeId = params.get('theme') ? Number(params.get('theme')) : null;
  const { recordResult, logAttempt } = useProgress();

  const [session, setSession] = useSessionStorage<QuizSession>('quiz', () => createSession(themeId));

  const qRef = session.questions[session.index];
  const q = qRef ? { item: ITEM_BY_ID[qRef.itemId], options: qRef.options } : null;
  const finished = !q;

  function restart(nextTheme: number | null) {
    setParams(nextTheme ? { theme: String(nextTheme) } : {});
    setSession(createSession(nextTheme));
  }

  function confirm(option: string) {
    if (!q || session.submitted) return;
    const correct = option === q.item.meaning;
    recordResult(q.item.id, correct);
    setSession((s) => ({ ...s, submitted: option, score: s.score + (correct ? 1 : 0) }));
  }

  function selectOption(option: string) {
    if (session.submitted) return;
    setSession((s) => ({ ...s, picked: option }));
  }

  function submitPicked() {
    if (!session.picked || session.submitted) return;
    confirm(session.picked);
  }

  function next() {
    setSession((s) => ({ ...s, index: s.index + 1, picked: null, submitted: null }));
  }

  useEffect(() => {
    if (finished && !session.attemptLogged && session.questions.length > 0) {
      logAttempt({
        mode: 'quiz',
        themeId: session.themeId,
        total: session.questions.length,
        correct: session.score,
      });
      setSession((s) => ({ ...s, attemptLogged: true }));
    }
  }, [finished, session.attemptLogged, session.questions.length, session.score, session.themeId, logAttempt, setSession]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pop">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quick Quiz</h1>
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
          Question {session.index + 1} of {session.questions.length} · Score {session.score}/
          {session.questions.length}
        </p>
      )}

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-3xl">{session.score === session.questions.length ? '🏆' : '✅'}</p>
          <p className="text-lg font-semibold">
            Round complete — {session.score}/{session.questions.length} correct
          </p>
          <button
            onClick={() => restart(themeId)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            New round
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            {q.item.themeTitle} · {q.item.topicTitle}
          </p>
          <p className="mt-3 text-lg font-semibold">
            What does <span className="text-brand-600">“{q.item.term}”</span> mean?
          </p>
          <p className="mt-1 text-sm text-ink-soft">e.g. “{q.item.usage}”</p>
          {!session.submitted && (
            <p className="mt-1 text-xs text-ink-soft">
              Select an answer, then press Submit — or double-click an option to answer instantly.
            </p>
          )}

          <div className="mt-5 grid gap-2">
            {q.options.map((option) => {
              const isCorrect = option === q.item.meaning;
              const isPicked = option === session.picked;
              const isSubmittedChoice = option === session.submitted;
              const showResult = session.submitted !== null;
              return (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  onDoubleClick={() => {
                    setSession((s) => ({ ...s, picked: option }));
                    confirm(option);
                  }}
                  disabled={showResult}
                  className={`rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                    showResult && isCorrect
                      ? 'border-mint-500 bg-mint-100 text-mint-500'
                      : showResult && isSubmittedChoice
                        ? 'border-rose-500 bg-rose-100 text-rose-500'
                        : !showResult && isPicked
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-line hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {!session.submitted ? (
            <button
              onClick={submitPicked}
              disabled={!session.picked}
              className="mt-5 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit answer
            </button>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm italic text-ink-soft">“{q.item.example}”</p>
              <button
                onClick={next}
                className="self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
