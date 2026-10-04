import { Link } from 'react-router-dom';
import { useProgress } from '../lib/progressContext';
import { ALL_ITEMS } from '../lib/collocations';
import { MODE_META, formatWhen, scoreTone, themeName } from '../lib/attempts';
import { TOTAL_ESSAYS, nextUnread, useEssayState } from '../lib/essayState';

function StatCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const { state, statusCounts, overallPct, themeMastery, dueCount, streak, studiedToday } = useProgress();
  const total = ALL_ITEMS.length;
  const essays = useEssayState();
  const essaysRead = essays.state.read.length;
  const upNext = nextUnread(essays.state.read);
  const recentAttempts = [...state.attempts].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 4);

  return (
    <div className="flex flex-col gap-8 animate-pop">
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back 👋</h1>
        <p className="mt-1 text-ink-soft">
          {studiedToday
            ? `Nice — you've already studied today. ${streak}-day streak going.`
            : dueCount > 0
              ? `You have ${dueCount} collocation${dueCount === 1 ? '' : 's'} due for review.`
              : 'No reviews due — great time to learn something new.'}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Mastered" value={statusCounts.mastered} sub={`of ${total}`} tone="text-mint-ink" />
        <StatCard label="In review" value={statusCounts.review} tone="text-brand-500" />
        <StatCard label="Learning" value={statusCounts.learning} tone="text-amber-ink" />
        <StatCard label="Not started" value={statusCounts.new} tone="text-ink-soft" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/flashcards"
          className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
        >
          <p className="text-2xl">🗂️</p>
          <p className="mt-2 font-semibold">Flashcards</p>
          <p className="mt-1 text-sm text-ink-soft">
            {dueCount > 0 ? `${dueCount} due now` : 'Spaced-repetition review'}
          </p>
        </Link>
        <Link
          to="/fill-blank"
          className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
        >
          <p className="text-2xl">✍️</p>
          <p className="mt-2 font-semibold">Fill the Blank</p>
          <p className="mt-1 text-sm text-ink-soft">Type the missing collocation</p>
        </Link>
        <Link
          to="/quiz"
          className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
        >
          <p className="text-2xl">⚡</p>
          <p className="mt-2 font-semibold">Quick Quiz</p>
          <p className="mt-1 text-sm text-ink-soft">Multiple-choice meanings</p>
        </Link>
        <Link
          to="/writing"
          className="group rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
        >
          <p className="text-2xl">📝</p>
          <p className="mt-2 font-semibold">Writing Practice</p>
          <p className="mt-1 text-sm text-ink-soft">Use collocations in your own sentences</p>
        </Link>
      </section>

      <section>
        <Link
          to={upNext ? `/essays/${upNext}` : '/essays'}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <p className="text-2xl">📖</p>
            <p className="mt-2 font-semibold">Model essays</p>
            <p className="mt-1 text-sm text-ink-soft">
              {upNext
                ? essaysRead > 0
                  ? `${essaysRead} of ${TOTAL_ESSAYS} read — continue with Essay ${upNext}`
                  : `${TOTAL_ESSAYS} Task 2 essays with key phrases and meanings — start with Essay 1`
                : `All ${TOTAL_ESSAYS} essays read. Revisit any of them.`}
            </p>
          </div>
          <div className="sm:w-56">
            <div className="h-2 overflow-hidden rounded-full bg-brand-50">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${(essaysRead / TOTAL_ESSAYS) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-ink-soft">
              {essaysRead}/{TOTAL_ESSAYS}
            </p>
          </div>
        </Link>
      </section>

      {recentAttempts.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link to="/history" className="text-sm font-medium text-brand-500 hover:underline">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentAttempts.map((a) => {
              const meta = MODE_META[a.mode];
              const pct = a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3 shadow-sm"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{meta.label}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {themeName(a.themeId)} · {formatWhen(a.finishedAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${scoreTone(pct)}`}>
                    {a.correct}/{a.total}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mastery by theme</h2>
          <span className="text-sm text-ink-soft">{overallPct}% overall</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {themeMastery.map((theme) => (
            <Link
              key={theme.id}
              to={`/browse?theme=${theme.id}`}
              className="rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand-300"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{theme.title}</span>
                <span className="text-ink-soft">
                  {theme.mastered}/{theme.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-50">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${theme.pct}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
