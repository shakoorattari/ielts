import { MODE_META, formatWhen, scoreTone, themeName } from '../lib/attempts';
import { useProgress } from '../lib/progressContext';
import type { AttemptRecord, PracticeMode } from '../types';

export function History() {
  const { state } = useProgress();
  const attempts = [...state.attempts].sort((a, b) => b.finishedAt - a.finishedAt);

  const totals = attempts.reduce(
    (acc, a) => ({ correct: acc.correct + a.correct, total: acc.total + a.total }),
    { correct: 0, total: 0 },
  );
  const overallPct = totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0;

  const perMode: Record<PracticeMode, number> = { flashcards: 0, 'fill-blank': 0, quiz: 0 };
  for (const a of attempts) perMode[a.mode] += 1;

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attempts History</h1>
        <p className="mt-1 text-ink-soft">Every completed flashcard session, fill-blank round, and quiz round.</p>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-soft">
          No attempts logged yet — finish a round in Flashcards, Fill the Blank, or Quick Quiz and it'll show up
          here.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total attempts" value={attempts.length} tone="text-ink" />
            <SummaryCard label="Overall accuracy" value={`${overallPct}%`} tone="text-brand-500" />
            <SummaryCard label="Flashcard sessions" value={perMode.flashcards} tone="text-ink-soft" />
            <SummaryCard label="Quiz + fill-blank" value={perMode.quiz + perMode['fill-blank']} tone="text-ink-soft" />
          </section>

          <section className="flex flex-col gap-2">
            {attempts.map((a) => (
              <AttemptRow key={a.id} attempt={a} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptRecord }) {
  const meta = MODE_META[attempt.mode];
  const pct = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm">
      <span className="text-xl">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{meta.label}</p>
        <p className="truncate text-xs text-ink-soft">
          {themeName(attempt.themeId)} · {formatWhen(attempt.finishedAt)}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreTone(pct)}`}>
        {attempt.correct}/{attempt.total}
      </span>
    </div>
  );
}
