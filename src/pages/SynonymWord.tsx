import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SpeakButton } from '../components/SpeakButton';
import { SynonymCredit } from '../components/SynonymCredit';
import { TOPIC_LABEL, WORDS, WORD_BY_N, analyze, cardId, findSpan, type Syn } from '../lib/synonyms';
import { MY_LIST_MAX, WORD_STAGES, stagesFor, useSynState } from '../lib/synState';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-ink-soft/10 text-ink-soft',
  learning: 'bg-amber-100 text-amber-ink',
  review: 'bg-brand-100 text-brand-700',
  mastered: 'bg-mint-100 text-mint-ink',
};

/** A sentence with the highlighted span picked out. */
function Marked({ text, target }: { text: string; target: string }) {
  const span = findSpan(text, target);
  if (!span) return <>{text}</>;
  return (
    <>
      {text.slice(0, span[0])}
      <mark className="rounded bg-brand-100 px-1 font-semibold text-brand-700">{text.slice(span[0], span[1])}</mark>
      {text.slice(span[1])}
    </>
  );
}

export function SynonymWord() {
  const { n: param } = useParams();
  // Re-mount per word so the swap chip, draft and notices start fresh.
  return <WordView key={param} n={Number(param)} />;
}

function WordView({ n }: { n: number }) {
  const word = WORD_BY_N[n];
  const navigate = useNavigate();
  const syn = useSynState();
  const [swap, setSwap] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [full, setFull] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (word) document.title = `${word.word}: synonyms — IELTS Band Builder`;
  }, [word]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return;
      if (e.key === 'ArrowLeft' && n > 1) navigate(`/synonyms/word/${n - 1}`);
      if (e.key === 'ArrowRight' && n < WORDS.length) navigate(`/synonyms/word/${n + 1}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, navigate]);

  const stages = useMemo(() => (word ? stagesFor(syn.state, n) : []), [syn.state, n, word]);
  const own = syn.state.sentences[String(n)] ?? [];
  const draftCheck = useMemo(() => {
    if (!word || !draft.trim()) return null;
    const a = analyze(draft);
    const used = a.upgrades.filter((u) => u.n === n);
    const plain = a.basic.find((b) => b.n === n);
    return { used, plain: plain?.count ?? 0 };
  }, [draft, n, word]);

  if (!word) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">That word isn’t in the list.</p>
        <Link to="/synonyms" className="font-medium text-brand-600 hover:underline">
          ← All synonyms
        </Link>
      </div>
    );
  }

  const shown: { text: string; target: string; label: string } = swap
    ? { text: word.syns.find((s) => s.w === swap)?.ex ?? word.ex, target: swap, label: swap }
    : { text: word.ex, target: word.word.toLowerCase(), label: word.word.toLowerCase() };
  const mine = syn.inMy(n);

  function saveSentence() {
    const text = draft.trim();
    if (!text) return;
    syn.addSentence(n, text);
    setDraft('');
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 animate-pop">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link to="/synonyms" className="font-medium text-brand-600 hover:underline">
          ← All words
        </Link>
        <div className="flex items-center gap-1">
          {n > 1 && (
            <Link to={`/synonyms/word/${n - 1}`} className="rounded-full px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50">
              ‹ Prev
            </Link>
          )}
          {n < WORDS.length && (
            <Link to={`/synonyms/word/${n + 1}`} className="rounded-full px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50">
              Next ›
            </Link>
          )}
        </div>
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Word {n} of {WORDS.length} · {word.pos}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{word.word}</h1>
          <SpeakButton text={word.word} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {word.topics.map((t) => (
            <span key={t} className="rounded-full bg-ink-soft/10 px-2.5 py-1 text-ink-soft">
              {TOPIC_LABEL[t]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-ink-soft">{word.why}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => {
            if (!syn.toggleMy(n)) setFull(true);
            else setFull(false);
          }}
          aria-pressed={mine}
          className={`rounded-full border px-3 py-1.5 font-medium ${
            mine ? 'border-amber-ink bg-amber-100 text-amber-ink' : 'border-line bg-surface text-ink-soft'
          }`}
        >
          {mine ? '★ In my words' : '☆ Add to my words'}
        </button>
        <button
          onClick={() => syn.toggleLearned(n)}
          aria-pressed={syn.state.learned.includes(n)}
          className={`rounded-full border px-3 py-1.5 font-medium ${
            syn.state.learned.includes(n) ? 'border-mint-ink bg-mint-100 text-mint-ink' : 'border-line bg-surface text-ink-soft'
          }`}
        >
          {syn.state.learned.includes(n) ? '✓ Learned' : 'Mark as learned'}
        </button>
      </div>
      {full && (
        <p role="status" className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-ink">
          Your starting list already has {MY_LIST_MAX} words. Remove one first, or come back when these feel natural.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Swap it in</p>
        <p className="mt-3 text-lg leading-relaxed sm:text-xl">
          <Marked text={shown.text} target={shown.target} />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SpeakButton text={shown.text} label="Listen to this sentence" />
          <button
            onClick={() => setSwap(null)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              !swap ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line text-ink-soft hover:border-brand-300'
            }`}
          >
            {word.word.toLowerCase()}
          </button>
          {word.syns.map((s) => (
            <button
              key={s.w}
              onClick={() => setSwap(s.w)}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                swap === s.w ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line text-ink-soft hover:border-brand-300'
              }`}
            >
              {s.w}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">Tap an upgrade to see it in a sentence. Each example is written to be natural, so the sentences may differ slightly.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Upgrades</h2>
        {word.syns.map((s) => (
          <SynCard key={s.w} n={n} s={s} status={syn.state.cards[cardId(n, s.w)]?.status ?? 'new'} />
        ))}
        {word.more && (
          <div className="rounded-xl border border-dashed border-line p-4 text-sm">
            <p className="font-semibold">More precise age words</p>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">
              {word.more.map((m) => (
                <li key={m.w}>
                  <span className="font-medium text-ink">{m.w}</span>: {m.note}
                </li>
              ))}
            </ul>
          </div>
        )}
        {word.tip && (
          <p className="rounded-xl bg-brand-50 p-4 text-sm">
            <span className="font-semibold text-brand-700">💡 Tip. </span>
            {word.tip}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold">Use it in your own sentence</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Write one sentence about education, the environment or technology that uses an upgrade from this page.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={`e.g. a sentence using “${word.syns[0].w}”…`}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-canvas p-3 text-[15px] leading-relaxed outline-none focus:border-brand-500"
        />
        {draftCheck && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-sm ${
              draftCheck.used.length ? 'bg-mint-100 text-mint-ink' : 'bg-amber-100 text-amber-ink'
            }`}
            role="status"
          >
            {draftCheck.used.length
              ? `Nice. You used ${draftCheck.used.map((u) => `“${u.syn}”`).join(' and ')}.`
              : draftCheck.plain
                ? `You used the plain word “${word.word.toLowerCase()}”. Try one of: ${word.syns.map((s) => s.w).join(', ')}.`
                : `None of this word's upgrades appear yet: ${word.syns.map((s) => s.w).join(', ')}.`}
          </p>
        )}
        <button
          onClick={saveSentence}
          disabled={!draft.trim()}
          className="mt-3 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
        >
          Save sentence
        </button>
        {own.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {own.map((t, i) => (
              <li key={`${i}-${t}`} className="flex items-start gap-2 rounded-lg bg-canvas p-3 text-sm">
                <span className="flex-1">{t}</span>
                <button
                  onClick={() => syn.removeSentence(n, i)}
                  className="text-xs font-medium text-rose-ink hover:underline"
                  aria-label="Delete this sentence"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Practise this word</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['🗂️', 'Flashcards', `/synonyms/flashcards?word=${n}`],
            ['⚡', 'Quiz', `/synonyms/quiz?word=${n}`],
            ['⌨️', 'Type it', `/synonyms/type?word=${n}`],
            ['✍️', 'Rewrite', `/synonyms/rewrite?word=${n}`],
          ].map(([icon, label, to]) => (
            <Link
              key={label}
              to={to}
              className="rounded-xl border border-line bg-surface px-3 py-3 text-center text-sm font-medium shadow-sm transition hover:border-brand-300"
            >
              <span className="mr-1" aria-hidden>
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Your progress with this word</h2>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORD_STAGES.map((label, i) => (
            <li
              key={label}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                stages[i] ? 'bg-mint-100 text-mint-ink' : 'bg-canvas text-ink-soft'
              }`}
            >
              {stages[i] ? '✓' : i + 1 + '.'} {label}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-soft">
          Learn: mark it learned or pass a flashcard. Context: three right answers or one sentence of your own. Pressure:
          use it in a timed test. Integrate: use it in three timed tests.
        </p>
      </section>

      <SynonymCredit />
    </article>
  );
}

function SynCard({ n, s, status }: { n: number; s: Syn; status: string }) {
  void n;
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-lg font-bold">{s.w}</h3>
          <SpeakButton text={s.w} />
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
      </div>
      <p className="text-sm text-ink-soft">{s.note}</p>
      <p className="mt-2 italic">
        “<Marked text={s.ex} target={s.w} />”
      </p>
      {s.use.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-ink-soft">Use it like:</span>
          {s.use.map((u) => (
            <span key={u} className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">
              {u}
            </span>
          ))}
        </div>
      )}
      {s.hook && (
        <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm">
          <span className="font-semibold">🧠 Remember it: </span>
          {s.hook}
        </p>
      )}
      {s.warn && (
        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-ink">
          <span className="font-semibold">⚠ Use with care: </span>
          {s.warn}
        </p>
      )}
    </div>
  );
}
