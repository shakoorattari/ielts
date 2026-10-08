import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HighlightedText } from '../components/HighlightedText';
import { WORD_BY_N, analyze, upgradeVerdict, type Segment } from '../lib/synonyms';

const SAMPLE =
  "Many people think that technology is important in modern life. Technology can help students to learn, and it gives people good access to information. However, the government should provide more money for local schools, because different families have different needs. It is necessary for children to learn skills that are important for work.";

const TONE: Record<string, string> = {
  none: 'bg-amber-100 text-amber-ink',
  start: 'bg-brand-50 text-brand-700',
  good: 'bg-mint-100 text-mint-ink',
  many: 'bg-brand-50 text-brand-700',
  'too-many': 'bg-rose-100 text-rose-ink',
};

export function SynScanner() {
  const [text, setText] = useState('');
  const [active, setActive] = useState<number | null>(null);
  const a = useMemo(() => analyze(text), [text]);
  const verdict = upgradeVerdict(a.distinctUpgrades);
  const cautions = useMemo(
    () =>
      a.upgrades.flatMap((u) => {
        const s = WORD_BY_N[u.n].syns.find((x) => x.w === u.syn);
        return s?.warn ? [{ syn: u.syn, warn: s.warn }] : [];
      }),
    [a],
  );
  const activeWord = active ? WORD_BY_N[active] : null;

  function pick(seg: Segment) {
    setActive((cur) => (cur === seg.n ? null : seg.n));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Essay scanner</h1>
        <p className="mt-1 text-ink-soft">
          Paste a paragraph or a whole essay. The scanner marks the plain words from the guide, shows how often you repeat
          them, and suggests upgrades that fit. Your text never leaves your browser. The upgrade count is a guide, not an IELTS score.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          placeholder="Paste or type your essay here…"
          aria-label="Your essay"
          className="w-full resize-y rounded-xl border border-line bg-surface p-4 text-[16px] leading-relaxed outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button onClick={() => setText(SAMPLE)} className="rounded-full border border-line px-4 py-2 font-medium text-ink-soft hover:border-brand-300">
            Try a sample
          </button>
          {text && (
            <button onClick={() => { setText(''); setActive(null); }} className="font-medium text-rose-ink hover:underline">
              Clear
            </button>
          )}
          <span className="ml-auto text-ink-soft">{a.words} words</span>
        </div>
      </div>

      {text.trim() ? (
        <>
          <section className={`rounded-xl p-4 ${TONE[verdict.tone]}`} role="status">
            <p className="font-semibold">
              {verdict.label}: {a.distinctUpgrades} distinct upgrade{a.distinctUpgrades === 1 ? '' : 's'} used
            </p>
            <p className="mt-1 text-sm">{verdict.detail}</p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Your text, marked</h2>
            <p className="mt-3 leading-relaxed">
              <HighlightedText text={text} segments={a.segments} onPick={pick} activeN={active} />
            </p>
            <p className="mt-3 text-xs text-ink-soft">
              <span className="rounded bg-amber-100 px-1 text-amber-ink">Plain word</span>{' '}
              <span className="rounded bg-mint-100 px-1 text-mint-ink">Upgrade you used</span> · Tap a marked word for suggestions.
            </p>
          </section>

          {activeWord && (
            <section className="rounded-2xl border border-brand-500 bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">Upgrades for “{activeWord.word.toLowerCase()}”</h2>
                <button onClick={() => setActive(null)} aria-label="Close suggestions" className="text-ink-soft hover:text-ink">
                  ✕
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-3">
                {activeWord.syns.map((s) => (
                  <li key={s.w} className="text-sm">
                    <p>
                      <strong>{s.w}</strong> <span className="text-ink-soft">· {s.note}</span>
                    </p>
                    <p className="italic text-ink-soft">“{s.ex}”</p>
                    {s.warn && <p className="mt-0.5 text-amber-ink">⚠ {s.warn}</p>}
                  </li>
                ))}
              </ul>
              <Link to={`/synonyms/word/${activeWord.n}`} className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                Study this word →
              </Link>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="font-semibold">Plain words you used</h2>
              {a.basic.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">None of the 50 plain words. Impressive variety.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {a.basic.map((b) => {
                    const over = b.count >= b.limit;
                    return (
                      <li key={b.n} className="flex items-center justify-between gap-2">
                        <button onClick={() => setActive(b.n)} className="text-left font-medium hover:text-brand-600">
                          {b.word.toLowerCase()}
                        </button>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            over ? 'bg-amber-100 text-amber-ink' : 'bg-ink-soft/10 text-ink-soft'
                          }`}
                        >
                          ×{b.count}
                          {over ? ' repeated' : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {a.overused.length > 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Some repetition is normal. “Repeated” flags words used often enough that a synonym would add variety.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="font-semibold">Upgrades you used</h2>
              {a.upgrades.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">None yet. Tap a plain word to see which upgrades fit.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {a.upgrades.map((u) => (
                    <li key={`${u.n}-${u.syn}`} className="flex items-center justify-between gap-2">
                      <span>
                        <strong>{u.syn}</strong>{' '}
                        <span className="text-ink-soft">for {WORD_BY_N[u.n].word.toLowerCase()}</span>
                      </span>
                      <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-semibold text-mint-ink">×{u.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {cautions.length > 0 && (
                <div className="mt-3 flex flex-col gap-1 rounded-lg bg-amber-100 p-3 text-xs text-amber-ink">
                  {cautions.map((c) => (
                    <p key={c.syn}>
                      <strong>{c.syn}:</strong> {c.warn}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          Paste some writing above, or press “Try a sample”, to see it analysed.
        </p>
      )}
    </div>
  );
}
