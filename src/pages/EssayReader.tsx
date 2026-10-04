import { Fragment, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ESSAYS, ESSAY_BY_N, readMinutes, topicLabel, typeLabel } from '../lib/essays';
import { useEssayState } from '../lib/essayState';
import { SourceCredit } from '../components/SourceCredit';

const TARGET_WORDS = 250;

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Renders **marked** spans as highlighted phrases (or plain text when highlights are off). */
function Highlighted({ text, on }: { text: string; on: boolean }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 === 1 ? (
          <strong
            key={i}
            className={on ? 'rounded bg-brand-100 px-0.5 font-semibold text-brand-700' : 'font-normal'}
          >
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function EssayReader() {
  const { n: param } = useParams();
  const navigate = useNavigate();
  const n = Number(param);
  const essay = ESSAY_BY_N[n];
  const es = useEssayState();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (essay) document.title = `Essay ${essay.n} — IELTS Prep`;
    return () => {
      document.title = '1000 IELTS Collocations — Practice App';
    };
  }, [essay]);

  // ← / → step through essays (ignored while typing in the answer box)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' && n > 1) navigate(`/essays/${n - 1}`);
      if (e.key === 'ArrowRight' && n < ESSAYS.length) navigate(`/essays/${n + 1}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, navigate]);

  if (!essay) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-ink-soft">That essay doesn’t exist.</p>
        <Link to="/essays" className="font-medium text-brand-500 hover:underline">
          ← All essays
        </Link>
      </div>
    );
  }

  const read = es.isRead(n);
  const saved = es.isSaved(n);
  const hasHighlights = essay.body.some((p) => p.includes('**'));
  const draft = es.state.drafts[String(n)] ?? '';
  const draftWords = wordCount(draft);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 animate-pop">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link to="/essays" className="font-medium text-brand-500 hover:underline">
          ← All essays
        </Link>
        <div className="flex items-center gap-1">
          <NavBtn to={n > 1 ? `/essays/${n - 1}` : null}>‹ Prev</NavBtn>
          <NavBtn to={n < ESSAYS.length ? `/essays/${n + 1}` : null}>Next ›</NavBtn>
        </div>
      </div>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Essay {essay.n}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            to={`/essays?type=${essay.type}`}
            className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-600 hover:bg-brand-100"
          >
            {typeLabel(essay.type)}
          </Link>
          {essay.topics.map((t) => (
            <Link
              key={t}
              to={`/essays?topic=${t}`}
              className="rounded-full bg-ink-soft/10 px-2.5 py-1 text-ink-soft hover:bg-ink-soft/20"
            >
              {topicLabel(t)}
            </Link>
          ))}
          <span className="text-ink-soft">
            · {essay.words} words · about {readMinutes(essay)} min read
          </span>
        </div>
      </header>

      <div className="rounded-xl border-l-4 border-brand-500 bg-brand-50 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Question</p>
        {essay.question.map((p, i) => (
          <p
            key={i}
            className={`mt-2 italic leading-relaxed ${i === essay.question.length - 1 && i > 0 ? 'font-semibold' : ''}`}
          >
            {p}
          </p>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          <button
            onClick={() => es.setFontSize(es.state.fontSize - 1)}
            className="grid h-7 w-8 place-items-center rounded-full text-xs font-bold hover:bg-brand-50"
            aria-label="Smaller text"
          >
            A−
          </button>
          <button
            onClick={() => es.setFontSize(es.state.fontSize + 1)}
            className="grid h-7 w-8 place-items-center rounded-full text-base font-bold hover:bg-brand-50"
            aria-label="Larger text"
          >
            A+
          </button>
        </div>
        {hasHighlights && (
          <button
            onClick={() => es.setHighlights(!es.state.highlights)}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              es.state.highlights
                ? 'border-brand-500 bg-brand-50 text-brand-600'
                : 'border-line bg-surface text-ink-soft'
            }`}
          >
            Highlights {es.state.highlights ? 'on' : 'off'}
          </button>
        )}
        <button
          onClick={() => es.toggleSaved(n)}
          className={`rounded-full border px-3 py-1.5 font-medium ${
            saved ? 'border-amber-500 bg-amber-100 text-amber-500' : 'border-line bg-surface text-ink-soft'
          }`}
        >
          {saved ? '★ Saved' : '☆ Save'}
        </button>
        <button
          onClick={() => es.toggleRead(n)}
          className={`rounded-full border px-3 py-1.5 font-medium ${
            read ? 'border-mint-500 bg-mint-100 text-mint-500' : 'border-line bg-surface text-ink-soft'
          }`}
        >
          {read ? '✓ Read' : 'Mark as read'}
        </button>
      </div>

      <div
        className="flex flex-col gap-5 font-serif leading-[1.75]"
        style={{ fontSize: `${es.state.fontSize}px` }}
      >
        {essay.body.map((p, i) => (
          <p key={i}>
            <Highlighted text={p} on={es.state.highlights} />
          </p>
        ))}
      </div>

      {essay.phrases.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-500">Key phrases</h2>
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-500/40 text-xs uppercase tracking-wide text-brand-500">
                  <th className="w-2/5 px-3 py-2 font-semibold">Phrase</th>
                  <th className="px-3 py-2 font-semibold">Meaning / synonyms</th>
                </tr>
              </thead>
              <tbody>
                {essay.phrases.map((p) => (
                  <tr key={p.phrase} className="border-b border-line last:border-0 even:bg-canvas/60">
                    <td className="px-3 py-2 align-top font-semibold">{p.phrase}</td>
                    <td className="px-3 py-2 align-top text-ink-soft">{p.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/phrases" className="mt-2 inline-block text-sm font-medium text-brand-500 hover:underline">
            Browse the full phrase bank →
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Now write your own answer</h2>
          <span
            className={`text-sm font-semibold ${draftWords >= TARGET_WORDS ? 'text-mint-500' : 'text-ink-soft'}`}
          >
            {draftWords} / {TARGET_WORDS} words
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Answer the question above in your own words, aiming for at least {TARGET_WORDS}. Saved in this browser as you type.
        </p>
        <textarea
          value={draft}
          onChange={(e) => es.setDraft(n, e.target.value)}
          rows={10}
          placeholder="Start writing here…"
          className="mt-3 w-full resize-y rounded-xl border border-line bg-canvas p-3 text-[15px] leading-relaxed outline-none focus:border-brand-500"
        />
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-50">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.min(100, (draftWords / TARGET_WORDS) * 100)}%` }}
          />
        </div>
        {draft && (
          <button
            onClick={() => {
              if (window.confirm('Clear your written answer for this essay?')) es.setDraft(n, '');
            }}
            className="mt-3 text-sm font-medium text-rose-500 hover:underline"
          >
            Clear answer
          </button>
        )}
      </section>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-4 text-sm">
        <NavBtn to={n > 1 ? `/essays/${n - 1}` : null}>‹ Essay {n - 1}</NavBtn>
        <button
          onClick={() => {
            es.markRead(n);
            if (n < ESSAYS.length) navigate(`/essays/${n + 1}`);
          }}
          className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          {read ? 'Next essay ›' : 'Mark read & next ›'}
        </button>
        <NavBtn to={n < ESSAYS.length ? `/essays/${n + 1}` : null}>Essay {n + 1} ›</NavBtn>
      </div>
      <SourceCredit />
    </article>
  );
}

function NavBtn({ to, children }: { to: string | null; children: React.ReactNode }) {
  if (!to) return <span className="w-20" />;
  return (
    <Link to={to} className="rounded-full px-3 py-1.5 font-medium text-brand-500 hover:bg-brand-50">
      {children}
    </Link>
  );
}
