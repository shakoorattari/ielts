import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BANDS, SKILLS, bandNeeded, formatBand, overallBand, rawRangeForBand, rawToBand } from '../lib/bands';
import type { ConvertKind, Skill } from '../lib/bands';

const SKILL_LABEL: Record<Skill, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };
const KIND_LABEL: Record<ConvertKind, string> = {
  listening: 'Listening (Academic and General Training)',
  'reading-academic': 'Reading, Academic',
  'reading-general': 'Reading, General Training',
};
const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500';

export function ScoreTools() {
  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Score tools</h1>
        <p className="mt-1 text-ink-soft">
          Work out your overall band, turn a practice-test mark into a band, and see what you still need to reach your
          target. Everything is calculated in your browser.
        </p>
      </div>
      <OverallCalculator />
      <RawConverter />
      <p className="rounded-xl border border-line bg-surface p-4 text-xs text-ink-soft">
        The overall band follows the published IELTS rule: the average of the four skills is rounded to the nearest half
        band, with .25 rounding up to the next half band and .75 up to the next whole band. The mark-to-band tables are the
        ones printed in the Cambridge IELTS practice books. In a real exam a boundary can move by one mark, so treat a
        converted band as an estimate. Writing and Speaking bands come from an examiner and cannot be calculated from a
        mark.
      </p>
    </div>
  );
}

function BandSelect({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (b: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className={field}>
        {BANDS.map((b) => (
          <option key={b} value={b}>
            {formatBand(b)}
          </option>
        ))}
      </select>
    </div>
  );
}

function OverallCalculator() {
  const [params, setParams] = useSearchParams();
  const [bands, setBands] = useState<Record<Skill, number>>({ listening: 6.5, reading: 6.5, writing: 6, speaking: 6.5 });
  const [target, setTarget] = useState(Number(params.get('target')) || 7);
  const [missing, setMissing] = useState<Skill>('speaking');

  const overall = overallBand(SKILLS.map((s) => bands[s]));
  const others = SKILLS.filter((s) => s !== missing).map((s) => bands[s]);
  const needed = bandNeeded(others, target);
  const weakest = SKILLS.reduce((a, b) => (bands[b] < bands[a] ? b : a));

  function changeTarget(b: number) {
    setTarget(b);
    setParams({ target: String(b) }, { replace: true });
  }

  return (
    <section aria-labelledby="overall-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 id="overall-h" className="text-lg font-semibold">
        Overall band calculator
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SKILLS.map((s) => (
          <BandSelect key={s} id={`band-${s}`} label={SKILL_LABEL[s]} value={bands[s]} onChange={(b) => setBands({ ...bands, [s]: b })} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <p className="text-sm text-ink-soft">Overall band</p>
        <p className="text-4xl font-bold text-brand-500" aria-live="polite" data-testid="overall">
          {formatBand(overall)}
        </p>
        <p className="text-sm text-ink-soft">
          Weakest skill: <strong className="text-ink">{SKILL_LABEL[weakest]}</strong>
          {bands[weakest] === Math.max(...SKILLS.map((s) => bands[s])) && ' (all skills are level)'}
        </p>
      </div>

      <h3 className="mt-6 text-sm font-semibold">What do I need to reach my target?</h3>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <BandSelect id="target" label="Target overall" value={target} onChange={changeTarget} />
        <div className="flex flex-col gap-1">
          <label htmlFor="missing" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Skill still to come
          </label>
          <select id="missing" value={missing} onChange={(e) => setMissing(e.target.value as Skill)} className={field}>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {SKILL_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-sm" aria-live="polite" data-testid="needed">
        {needed === null ? (
          <>With the other three bands above, even a 9.0 in {SKILL_LABEL[missing]} would not reach {formatBand(target)} overall.</>
        ) : needed === 0 ? (
          <>You already reach {formatBand(target)} overall whatever you score in {SKILL_LABEL[missing]}.</>
        ) : (
          <>
            You need at least <strong>{formatBand(needed)}</strong> in {SKILL_LABEL[missing]} to reach {formatBand(target)} overall.
          </>
        )}
      </p>
    </section>
  );
}

function RawConverter() {
  const [kind, setKind] = useState<ConvertKind>('listening');
  const [rawText, setRawText] = useState('28');
  const [goal, setGoal] = useState(7);

  const raw = rawText.trim() === '' ? NaN : Number(rawText);
  const valid = Number.isInteger(raw) && raw >= 0 && raw <= 40;
  const band = valid ? rawToBand(kind, raw) : null;
  const range = rawRangeForBand(kind, goal);

  return (
    <section aria-labelledby="raw-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 id="raw-h" className="text-lg font-semibold">
        Practice-test mark to band
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="kind" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Test
          </label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as ConvertKind)} className={field}>
            {(Object.keys(KIND_LABEL) as ConvertKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="raw" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Correct answers (0 to 40)
          </label>
          <input
            id="raw"
            inputMode="numeric"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            aria-invalid={!valid}
            aria-describedby="raw-msg"
            className={`${field} w-28`}
          />
        </div>
      </div>
      <p id="raw-msg" className="mt-3 text-sm" aria-live="polite" data-testid="raw-result">
        {band === null ? (
          <span className="text-rose-ink">Enter a whole number from 0 to 40.</span>
        ) : (
          <>
            {raw}/40 is about <strong>band {formatBand(band)}</strong>
            {band === 2 && ' or below'}.
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <BandSelect id="goal" label="Band I want" value={goal} onChange={setGoal} />
        <p className="pb-2 text-sm" data-testid="range-result">
          {range ? (
            <>
              Aim for <strong>{range[0] === range[1] ? range[0] : `${range[0]} to ${range[1]}`}</strong> correct out of 40.
            </>
          ) : (
            <>This test has no raw-score range for band {formatBand(goal)}.</>
          )}
        </p>
      </div>
    </section>
  );
}
