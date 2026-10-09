import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HighlightedText } from '../components/HighlightedText';
import { AiTextReview } from '../components/AiCoach';
import { WORD_BY_N, analyze, upgradeVerdict, type Segment } from '../lib/synonyms';
import { essayPlainText, loadEssays, useEssayLibrary } from '../lib/essayLibrary';

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
  const [params] = useSearchParams();
  const lib = useEssayLibrary();
  const [loaded, setLoaded] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [openPicker, setOpenPicker] = useState(false);

  // Arriving from an essay ("Scan this essay") opens the scanner with that essay already loaded.
  const essayParam = Number(params.get('essay')) || 0;
  const { attach } = lib;
  useEffect(() => {
    if (!essayParam) return;
    let live = true;
    loadEssays().then((mod) => {
      if (!live) return;
      attach(mod);
      const e = mod.ESSAY_BY_N[essayParam];
      if (e) {
        setText(essayPlainText(e));
        setLoaded(essayParam);
        setOpenPicker(true);
      }
    });
    return () => {
      live = false;
    };
  }, [essayParam, attach]);

  function loadEssay(n: number) {
    const e = lib.mod?.ESSAY_BY_N[n];
    if (!e) return;
    setText(essayPlainText(e));
    setLoaded(n);
    setNumberInput(String(n));
    setActive(null);
  }

  function randomEssay() {
    const all = lib.mod?.ESSAYS ?? [];
    const pool = all.filter((e) => (!typeFilter || e.type === typeFilter) && e.n !== loaded);
    if (pool.length) loadEssay(pool[Math.floor(Math.random() * pool.length)].n);
  }

  const loadedEssay = loaded && lib.mod ? lib.mod.ESSAY_BY_N[loaded] : null;
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

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Scan a model essay</h2>
            <p className="text-sm text-ink-soft">
              See which plain words and upgrades appear in any of the 202 model essays, then compare with your own writing.
            </p>
          </div>
          {!openPicker && (
            <button
              onClick={() => {
                setOpenPicker(true);
                lib.load();
              }}
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600"
            >
              Choose an essay
            </button>
          )}
        </div>
        {openPicker && !lib.mod && <p className="mt-3 text-sm text-ink-soft">Loading the essays…</p>}
        {openPicker && lib.mod && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Essay number</span>
                <input
                  type="number"
                  min={1}
                  max={lib.mod.ESSAYS.length}
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadEssay(Number(numberInput));
                  }}
                  placeholder="1–202"
                  className="w-28 rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand-500"
                />
              </label>
              <button
                onClick={() => loadEssay(Number(numberInput))}
                disabled={!lib.mod.ESSAY_BY_N[Number(numberInput)]}
                className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
              >
                Load
              </button>
              <span className="px-1 text-ink-soft">or</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Essay type for random essay"
                className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand-500"
              >
                <option value="">Any essay type</option>
                {lib.mod.TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button onClick={randomEssay} className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
                🎲 Random essay
              </button>
            </div>
            {loadedEssay && (
              <div className="rounded-xl border-l-4 border-brand-500 bg-brand-50 p-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <strong>Essay {loadedEssay.n}</strong>
                  <span className="text-ink-soft">{lib.mod.typeLabel(loadedEssay.type)}</span>
                  <Link to={`/essays/${loadedEssay.n}`} className="font-medium text-brand-600 hover:underline">
                    Read it →
                  </Link>
                  <span className="ml-auto flex gap-2">
                    {loadedEssay.n > 1 && (
                      <button onClick={() => loadEssay(loadedEssay.n - 1)} className="font-medium text-brand-600 hover:underline">
                        ‹ Previous
                      </button>
                    )}
                    {loadedEssay.n < lib.mod.ESSAYS.length && (
                      <button onClick={() => loadEssay(loadedEssay.n + 1)} className="font-medium text-brand-600 hover:underline">
                        Next ›
                      </button>
                    )}
                  </span>
                </p>
                <p className="mt-1 italic leading-relaxed">{lib.mod.questionText(loadedEssay)}</p>
              </div>
            )}
          </div>
        )}
      </section>

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
          <button onClick={() => { setText(SAMPLE); setLoaded(null); }} className="rounded-full border border-line px-4 py-2 font-medium text-ink-soft hover:border-brand-300">
            Try a plain sample
          </button>
          {text && (
            <button onClick={() => { setText(''); setActive(null); setLoaded(null); }} className="font-medium text-rose-ink hover:underline">
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

          <AiTextReview text={text} />

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
