import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BANDS, formatBand } from '../lib/bands';
import { usePlanState } from '../lib/planState';
import { PHASE_TEXT, dateKey, planDay, planWeek } from '../lib/studyPlan';
import type { Focus } from '../lib/studyPlan';

const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500';
const FOCUS_LABEL: Record<Focus, string> = {
  '': 'No preference (balanced)',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
};
const HOURS = [0.5, 1, 1.5, 2, 3, 4, 6];
const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export function StudyPlanner() {
  const plan = usePlanState();
  const { state } = plan;
  const [today] = useState(() => new Date());
  const todayKey = dateKey(today);

  const day = useMemo(() => planDay(today, state), [today, state]);
  const week = useMemo(() => planWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), state), [today, state]);
  const doneToday = state.done[todayKey] ?? [];
  const finished = day.tasks.filter((t) => doneToday.includes(t.id));
  const pct = day.tasks.length ? Math.round((finished.length / day.tasks.length) * 100) : 0;
  const phase = PHASE_TEXT[day.phase];

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study planner</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Tell the planner when your exam is and how much time you have each day. It builds a daily checklist that changes as the exam
          gets closer. Everything stays in this browser.
        </p>
      </div>

      <section aria-labelledby="plan-set" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 id="plan-set" className="text-lg font-semibold">
          Your plan
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="exam-date" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Exam date
            </label>
            <input id="exam-date" type="date" value={state.examDate} min={todayKey} onChange={(e) => plan.update({ examDate: e.target.value })} className={field} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan-target" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Target overall band
            </label>
            <select id="plan-target" value={state.target} onChange={(e) => plan.update({ target: Number(e.target.value) })} className={field}>
              {BANDS.filter((b) => b >= 4).map((b) => (
                <option key={b} value={b}>
                  {formatBand(b)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan-hours" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Study time per day
            </label>
            <select id="plan-hours" value={state.hours} onChange={(e) => plan.update({ hours: Number(e.target.value) })} className={field}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h < 1 ? '30 minutes' : h === 1 ? '1 hour' : `${h} hours`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan-focus" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Weakest area
            </label>
            <select id="plan-focus" value={state.focus} onChange={(e) => plan.update({ focus: e.target.value as Focus })} className={field}>
              {(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => (
                <option key={f} value={f}>
                  {FOCUS_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Not sure which skill is weakest?{' '}
          <Link to={`/tools?target=${state.target}`} className="font-medium text-brand-700 underline underline-offset-2">
            Enter your practice scores
          </Link>{' '}
          and see what you need to reach {formatBand(state.target)}.
        </p>
      </section>

      <section aria-labelledby="plan-today" className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="plan-today" className="mr-auto text-lg font-semibold">
            Today, {DAY.format(today)}
          </h2>
          {day.daysLeft !== null && day.daysLeft >= 0 && (
            <p className="text-sm font-semibold text-brand-700" data-testid="days-left">
              {day.daysLeft === 0 ? 'Exam day' : `${day.daysLeft} day${day.daysLeft === 1 ? '' : 's'} to go`}
            </p>
          )}
        </div>
        <p className="mt-1 text-sm" data-testid="phase">
          <strong>{phase.title}.</strong> {phase.detail}
        </p>

        {day.tasks.length > 0 && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-label="Today's progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-soft" data-testid="progress">
              {finished.length} of {day.tasks.length} done · about {day.minutes} minutes planned
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {day.tasks.map((t) => {
                const checked = doneToday.includes(t.id);
                return (
                  <li key={t.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                    <input id={`task-${t.id}`} type="checkbox" checked={checked} onChange={() => plan.toggleDone(todayKey, t.id)} className="mt-1 h-4 w-4 accent-brand-500" />
                    <label htmlFor={`task-${t.id}`} className={`flex-1 cursor-pointer text-sm ${checked ? 'text-ink-soft line-through' : ''}`}>
                      {t.label}
                      <span className="ml-2 text-xs text-ink-soft">{t.minutes} min</span>
                    </label>
                    {t.to && (
                      <Link to={t.to} className="shrink-0 text-sm font-medium text-brand-700 underline underline-offset-2">
                        Open
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            {pct === 100 && <p className="mt-3 text-sm font-semibold text-mint-ink">All done for today. Well done.</p>}
          </>
        )}
      </section>

      {week.some((d) => d.tasks.length > 0) && (
        <section aria-labelledby="plan-week" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 id="plan-week" className="text-lg font-semibold">
            The next seven days
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {week.map((d) => (
              <li key={d.date} className="py-2 text-sm">
                <p className="font-medium">
                  {DAY.format(new Date(`${d.date}T12:00:00`))}
                  <span className="ml-2 text-xs font-normal text-ink-soft">{d.tasks.length ? `${d.minutes} min` : 'nothing planned'}</span>
                </p>
                {d.tasks.length > 0 && <p className="text-ink-soft">{d.tasks.map((t) => t.label.split(':')[0].split(',')[0]).join(' · ')}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-xl border border-line bg-surface p-4 text-xs text-ink-soft">
        This is a general routine, not a promise of a score. Real progress depends on where you start and how carefully you review your
        mistakes. Reading, Listening and Task 1 work uses official practice materials, which you can find free on the IELTS and British
        Council websites or in the Cambridge practice books.
      </p>
      <div>
        <button
          onClick={() => {
            if (window.confirm('Clear your exam date, settings and ticked tasks?')) plan.reset();
          }}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-rose-500"
        >
          Reset planner
        </button>
      </div>
    </div>
  );
}
