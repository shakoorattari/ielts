import { Link } from 'react-router-dom';
import { useProgress } from '../lib/progressContext';
import { ALL_ITEMS } from '../lib/collocations';

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
  const { statusCounts, overallPct, themeMastery, dueCount, streak, studiedToday } = useProgress();
  const total = ALL_ITEMS.length;

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
        <StatCard label="Mastered" value={statusCounts.mastered} sub={`of ${total}`} tone="text-mint-500" />
        <StatCard label="In review" value={statusCounts.review} tone="text-brand-500" />
        <StatCard label="Learning" value={statusCounts.learning} tone="text-amber-500" />
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
