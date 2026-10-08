import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SynScopePicker } from '../components/SynScopePicker';
import { HighlightedText } from '../components/HighlightedText';
import {
  PARAGRAPHS,
  WORD_BY_N,
  analyze,
  capFirst,
  findSpan,
  rewriteItems,
  shuffle,
  upgradeVerdict,
  type RewriteItem,
} from '../lib/synonyms';
import { useSynState } from '../lib/synState';
import { useSynScope } from '../lib/useSynScope';

type Tab = 'sentences' | 'paragraphs';

export function SynRewrite() {
  const [tab, setTab] = useState<Tab>('sentences');
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 animate-pop">
      <header>
        <Link to="/synonyms" className="text-sm font-medium text-brand-600 hover:underline">
          ← Synonyms
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Rewrite it</h1>
        <p className="mt-1 text-ink-soft">
          The best way to own a word is to write with it. Upgrade plain sentences first, then whole paragraphs. Nothing
          is sent anywhere. It all stays in your browser.
        </p>
      </header>
      <div className="flex gap-1 self-start rounded-full bg-brand-50 p-1 text-sm">
        {(['sentences', 'paragraphs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? 'bg-brand-500 text-on-brand' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'sentences' ? <Sentences /> : <Paragraphs />}
    </div>
  );
}

/* ------------------------------------------------------------------ sentences */

type Verdict = { kind: 'best' | 'ok' | 'plain' | 'other'; used?: string };

function judge(text: string, item: RewriteItem): Verdict {
  const t = text.toLowerCase();
  const a = analyze(text);
  const best = item.ok.find((o) => findSpan(t, o));
  if (best) return { kind: 'best', used: best };
  const up = a.upgrades.find((u) => u.n === item.n);
  if (up) return { kind: 'ok', used: up.syn };
  if (findSpan(t, item.base.toLowerCase())) return { kind: 'plain' };
  return { kind: 'other' };
}

function modelSentence(item: RewriteItem, option: string): string {
  const out = item.plain.replace(item.base, option);
  return item.plain.startsWith(item.base) ? capFirst(out) : out;
}

function Sentences() {
  const scope = useSynScope();
  const [round, setRound] = useState<number | null>(null);
  const available = rewriteItems({ words: scope.words }).length;
  return round === null ? (
    <>
      <SynScopePicker available={available} />
      <button
        onClick={() => setRound(Date.now())}
        disabled={available === 0}
        className="self-start rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
      >
        Start rewriting
      </button>
    </>
  ) : (
    <SentenceRunner key={round} onDone={() => setRound(null)} />
  );
}

function SentenceRunner({ onDone }: { onDone: () => void }) {
  const scope = useSynScope();
  const syn = useSynState();
  const [items] = useState<RewriteItem[]>(() => shuffle(rewriteItems({ words: scope.words })).slice(0, 8));
  const [i, setI] = useState(0);
  const item = items[i];
  const [text, setText] = useState(() => items[0]?.plain ?? '');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [good, setGood] = useState(0);
  const logged = useRef(false);
  const done = i >= items.length;

  useEffect(() => {
    if (done && !logged.current && items.length) {
      logged.current = true;
      syn.logAttempt({ mode: 'rewrite', correct: good, total: items.length, at: Date.now() });
    }
    // log once when the round ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (items.length === 0) return <p className="text-ink-soft">No sentences in this set.</p>;

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-3xl">{good >= items.length * 0.7 ? '🌟' : '👍'}</p>
        <h2 className="mt-2 text-xl font-bold">
          {good} of {items.length} upgraded with a fitting word
        </h2>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={onDone} className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-on-brand">
            More sentences
          </button>
          <Link to="/synonyms/timed" className="rounded-full border border-line px-4 py-2 font-medium hover:border-brand-300">
            Timed test
          </Link>
        </div>
      </div>
    );
  }

  const word = WORD_BY_N[item.n];
  const span = findSpan(item.plain, item.base);

  function check() {
    if (verdict || !text.trim()) return;
    const v = judge(text, item);
    setVerdict(v);
    const win = v.kind === 'best' || v.kind === 'ok';
    syn.record(item.n, win);
    if (v.kind === 'best') setGood((g) => g + 1);
  }

  function next() {
    const n = items[i + 1];
    setVerdict(null);
    setText(n?.plain ?? '');
    setI((x) => x + 1);
  }

  const tone =
    verdict?.kind === 'best'
      ? 'bg-mint-100 text-mint-ink'
      : verdict?.kind === 'ok'
        ? 'bg-brand-50 text-brand-700'
        : 'bg-amber-100 text-amber-ink';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>
          Sentence {i + 1} of {items.length}
        </span>
        <span>{good} fitting</span>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Upgrade “{item.base}”{item.base.toLowerCase() !== word.word.toLowerCase() ? ` (${word.word.toLowerCase()})` : ''}
        </p>
        <p className="mt-3 text-lg leading-relaxed">
          {span ? (
            <>
              {item.plain.slice(0, span[0])}
              <mark className="rounded bg-amber-100 px-1 font-semibold text-amber-ink">{item.plain.slice(span[0], span[1])}</mark>
              {item.plain.slice(span[1])}
            </>
          ) : (
            item.plain
          )}
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Ideas: {word.syns.map((s) => s.w).join(', ')}
        </p>
      </div>

      <label className="text-sm font-medium" htmlFor="rewrite-box">
        Your version
      </label>
      <textarea
        id="rewrite-box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!!verdict}
        rows={3}
        className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-[16px] leading-relaxed outline-none focus:border-brand-500"
      />

      {!verdict ? (
        <button
          onClick={check}
          disabled={!text.trim()}
          className="self-start rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
        >
          Check
        </button>
      ) : (
        <div role="status" className={`rounded-xl p-4 text-sm ${tone}`}>
          <p className="font-semibold">
            {verdict.kind === 'best' && `Spot on: “${verdict.used}” fits this sentence.`}
            {verdict.kind === 'ok' && `“${verdict.used}” is a real upgrade for this word, but it isn’t the best fit here. Compare with the models below.`}
            {verdict.kind === 'plain' && `You kept the plain word. Try swapping in one of the upgrades.`}
            {verdict.kind === 'other' && `I don’t recognise an upgrade from the list. If your word works, great, but check the models below.`}
          </p>
          <p className="mt-2 font-medium">Models that work:</p>
          <ul className="mt-1 list-disc pl-5">
            {item.ok.map((o) => (
              <li key={o}>{modelSentence(item, o)}</li>
            ))}
          </ul>
          <button onClick={next} className="mt-3 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600">
            {i + 1 === items.length ? 'See results' : 'Next sentence'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ paragraphs */

function Paragraphs() {
  const syn = useSynState();
  const [id, setId] = useState(PARAGRAPHS[0].id);
  const task = PARAGRAPHS.find((p) => p.id === id) ?? PARAGRAPHS[0];
  return <ParagraphTask key={task.id} task={task} onPick={setId} syn={syn} />;
}

function ParagraphTask({
  task,
  onPick,
  syn,
}: {
  task: (typeof PARAGRAPHS)[number];
  onPick: (id: string) => void;
  syn: ReturnType<typeof useSynState>;
}) {
  const [text, setText] = useState(task.text);
  const [checked, setChecked] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const before = useMemo(() => analyze(task.text), [task.text]);
  const after = useMemo(() => analyze(text), [text]);
  const verdict = upgradeVerdict(after.distinctUpgrades);

  function check() {
    setChecked(true);
    for (const u of after.upgrades) syn.record(u.n, true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {PARAGRAPHS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              p.id === task.id ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">The plain paragraph</p>
        <p className="mt-3 leading-relaxed">
          <HighlightedText text={task.text} segments={before.segments} />
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          <span className="rounded bg-amber-100 px-1 text-amber-ink">Highlighted</span> words are the plain words from the
          guide. Upgrade as many as sound natural. You don’t need to change them all.
        </p>
      </div>

      <label htmlFor="para-box" className="text-sm font-medium">
        Your upgraded paragraph
      </label>
      <textarea
        id="para-box"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setChecked(false);
        }}
        rows={7}
        className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-[16px] leading-relaxed outline-none focus:border-brand-500"
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={check} className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600">
          Check my upgrades
        </button>
        <button
          onClick={() => {
            setText(task.text);
            setChecked(false);
          }}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-brand-300"
        >
          Start again
        </button>
        <button onClick={() => setShowModel((v) => !v)} className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:border-brand-300">
          {showModel ? 'Hide' : 'Show'} a model upgrade
        </button>
      </div>

      {checked && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-sm shadow-sm">
          <p className="font-semibold">
            {verdict.label}: {after.distinctUpgrades} upgrade{after.distinctUpgrades === 1 ? '' : 's'} used
          </p>
          <p className="text-ink-soft">{verdict.detail}</p>
          {after.upgrades.length > 0 && (
            <p>
              <span className="font-semibold">You used: </span>
              {after.upgrades.map((u) => u.syn).join(', ')}
            </p>
          )}
          {after.basic.length > 0 && (
            <p>
              <span className="font-semibold">Plain words left: </span>
              {after.basic.map((b) => `${b.word.toLowerCase()}${b.count > 1 ? ` ×${b.count}` : ''}`).join(', ')}.{' '}
              <span className="text-ink-soft">That’s fine for common words. Upgrade the ones where a precise word is clearly better.</span>
            </p>
          )}
        </div>
      )}
      {showModel && (
        <div className="rounded-xl bg-mint-100 p-4 text-sm text-mint-ink">
          <p className="font-semibold">One possible upgrade</p>
          <p className="mt-1 leading-relaxed">{task.model}</p>
        </div>
      )}
    </div>
  );
}
