import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ALL_ITEMS, ITEM_BY_ID, THEMES, shuffle } from '../lib/collocations';
import { useProgress } from '../lib/progressContext';
import { useSessionStorage } from '../lib/useSessionStorage';
import { isDue } from '../lib/srs';
import type { Grade, ItemProgress } from '../types';

const SESSION_SIZE = 15;

function buildQueue(themeId: number | null, getProgress: (id: string) => ItemProgress): string[] {
  const scoped = themeId ? ALL_ITEMS.filter((i) => i.themeId === themeId) : ALL_ITEMS;
  const now = Date.now();
  const due: string[] = [];
  const fresh: string[] = [];
  for (const item of scoped) {
    const p = getProgress(item.id);
    if (p.reps > 0 && isDue(p, now)) due.push(item.id);
    else if (p.reps === 0) fresh.push(item.id);
  }
  const dueShuffled = shuffle(due);
  const freshShuffled = shuffle(fresh);
  const queue = [...dueShuffled.slice(0, SESSION_SIZE)];
  if (queue.length < SESSION_SIZE) {
    queue.push(...freshShuffled.slice(0, SESSION_SIZE - queue.length));
  }
  return queue;
}

interface FlashcardsSession {
  themeId: number | null;
  queue: string[];
  index: number;
  sessionDone: number;
  sessionCorrect: number;
  attemptLogged: boolean;
}

export function Flashcards() {
  const [params, setParams] = useSearchParams();
  const themeId = params.get('theme') ? Number(params.get('theme')) : null;
  const { getProgress, gradeItem, dueCount, logAttempt } = useProgress();

  function createSession(theme: number | null): FlashcardsSession {
    return {
      themeId: theme,
      queue: buildQueue(theme, getProgress),
      index: 0,
      sessionDone: 0,
      sessionCorrect: 0,
      attemptLogged: false,
    };
  }

  const [session, setSession] = useSessionStorage<FlashcardsSession>('flashcards', () => createSession(themeId));
  const [flipped, setFlipped] = useState(false);

  function restart(nextTheme: number | null) {
    setParams(nextTheme ? { theme: String(nextTheme) } : {});
    setSession(createSession(nextTheme));
    setFlipped(false);
  }

  const currentId = session.queue[session.index];
  const item = currentId ? ITEM_BY_ID[currentId] : null;
  const finished = !item;

  function grade(g: Grade) {
    if (!currentId) return;
    gradeItem(currentId, g);
    setSession((s) => ({
      ...s,
      index: s.index + 1,
      sessionDone: s.sessionDone + 1,
      sessionCorrect: s.sessionCorrect + (g === 'again' ? 0 : 1),
    }));
    setFlipped(false);
  }

  useEffect(() => {
    if (finished && !session.attemptLogged && session.sessionDone > 0) {
      logAttempt({
        mode: 'flashcards',
        themeId: session.themeId,
        total: session.sessionDone,
        correct: session.sessionCorrect,
      });
      setSession((s) => ({ ...s, attemptLogged: true }));
    }
  }, [finished, session.attemptLogged, session.sessionDone, session.sessionCorrect, session.themeId, logAttempt, setSession]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 animate-pop">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
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
          Card {session.index + 1} of {session.queue.length} · {dueCount} total due
        </p>
      )}

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-3xl">🎉</p>
          <p className="text-lg font-semibold">
            {session.sessionDone > 0
              ? `Session complete — ${session.sessionDone} reviewed!`
              : 'Nothing to review right now.'}
          </p>
          <p className="text-sm text-ink-soft">
            {dueCount > 0
              ? `${dueCount} more still due — start another round when ready.`
              : "You're all caught up. Great work."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => restart(themeId)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Start new session
            </button>
            <Link to="/browse" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
              Browse instead
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            key={currentId}
            onClick={() => setFlipped((f) => !f)}
            className={`animate-pop flex min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center shadow-md transition-colors ${
              flipped ? 'border-brand-300 bg-surface' : 'border-line bg-surface'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {item!.themeTitle} · {item!.topicTitle}
            </p>
            <p className="text-2xl font-bold">{item!.term}</p>
            <p className="text-ink-soft">{item!.usage}</p>
            {flipped ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                <p className="font-medium">{item!.meaning}</p>
                <p className="text-sm italic text-brand-600">“{item!.example}”</p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-ink-soft">Tap to reveal meaning</p>
            )}
          </div>

          {!flipped ? (
            <button
              onClick={() => setFlipped(true)}
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Show answer
            </button>
          ) : (
            <div className="grid w-full grid-cols-4 gap-2">
              <GradeButton label="Again" hint="<10m" tone="bg-rose-500" onClick={() => grade('again')} />
              <GradeButton label="Hard" hint="short" tone="bg-amber-500" onClick={() => grade('hard')} />
              <GradeButton label="Good" hint="normal" tone="bg-brand-500" onClick={() => grade('good')} />
              <GradeButton label="Easy" hint="long" tone="bg-mint-500" onClick={() => grade('easy')} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GradeButton({
  label,
  hint,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110 ${tone}`}
    >
      {label}
      <span className="text-[10px] font-normal opacity-80">{hint}</span>
    </button>
  );
}
