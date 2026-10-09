import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SynonymCredit } from '../components/SynonymCredit';
import { VideoEmbed } from '../components/VideoEmbed';
import { AiStatusBanner } from '../components/AiCoach';
import { TOPIC_KEYS, TOPIC_LABEL, WORDS } from '../lib/synonyms';
import { MY_LIST_MAX, TOTAL_WORDS, WORD_STAGES, dueCardCount, stageCount, stagesFor, useSynState } from '../lib/synState';

const MODES = [
  { to: '/synonyms/flashcards', icon: '🗂️', title: 'Flashcards', blurb: 'Spaced repetition. Recall each upgrade from its sentence.' },
  { to: '/synonyms/quiz', icon: '⚡', title: 'Quiz', blurb: 'Pick the word that fits. Includes tricky context questions.' },
  { to: '/synonyms/type', icon: '⌨️', title: 'Type it', blurb: 'Fill the blank from memory, with typo tolerance.' },
  { to: '/synonyms/rewrite', icon: '✍️', title: 'Rewrite', blurb: 'Upgrade whole sentences and paragraphs yourself.' },
  { to: '/synonyms/scanner', icon: '🔍', title: 'Essay scanner', blurb: 'Paste your essay. See overused words and suggested upgrades.' },
  { to: '/synonyms/timed', icon: '⏱️', title: 'Timed test', blurb: 'Write under pressure with your words as targets.' },
];

const DONTS = [
  ['Don’t force “impressive” words', '“Individuals should ameliorate their quotidian existence” sounds fake. “People should improve their daily lives” is clear and confident.'],
  ['Don’t use a word you’re unsure about', 'If you aren’t 100% sure of the meaning, leave it out. Uncertainty shows, and examiners notice.'],
  ['Don’t cram every word into one essay', 'Two to five natural upgrades is the sweet spot. Ten is a ceiling, not a target.'],
  ['Don’t ignore context', '“Many individuals believe…” is odd when you mean children. “Many youngsters believe…” fits. Choose the word for the situation.'],
];

export function SynonymsHub() {
  const { state, inMy, toggleMy } = useSynState();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [full, setFull] = useState(false);
  const due = dueCardCount(state);

  const learnedCount = state.learned.length;
  const stageTotals = useMemo(
    () => WORD_STAGES.map((_, i) => WORDS.filter((w) => stagesFor(state, w.n)[i]).length),
    [state],
  );
  const myByStage = WORD_STAGES.map((_, i) => state.my.filter((n) => stagesFor(state, n)[i]).length);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WORDS.filter((w) => {
      if (topic && !w.topics.includes(topic)) return false;
      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) || w.syns.some((s) => s.w.toLowerCase().includes(q) || s.note.toLowerCase().includes(q))
      );
    });
  }, [query, topic]);

  return (
    <div className="flex flex-col gap-10 animate-pop">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Vocabulary</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">50 synonym upgrades</h1>
        <p className="mt-2 max-w-3xl text-ink-soft">
          Replace the plain words that appear in almost every essay (people, important, good…) with precise, natural
          ones that show the range and accuracy IELTS looks for. Learn each in context, practise it several ways, then
          test yourself under exam pressure.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Words learned" value={`${learnedCount}/${TOTAL_WORDS}`} tone="text-mint-ink" />
          <Stat label="Cards due" value={String(due)} tone={due > 0 ? 'text-rose-ink' : 'text-ink-soft'} />
          <Stat label="Used in a timed test" value={String(stageTotals[2])} tone="text-brand-600" />
          <Stat label="Integrated" value={String(stageTotals[3])} tone="text-amber-ink" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">The guide’s four-step system</h2>
        <p className="mt-1 text-sm text-ink-soft">Don’t memorise everything at once. Quality beats quantity every time.</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            title="Pick your starting five"
            body="Choose five words that feel natural to you, and practise them in sentences until they feel automatic."
            progress={`${state.my.length}/${MY_LIST_MAX} chosen`}
            cta={{ to: '#words', label: state.my.length ? 'Change my words' : 'Choose from the list' }}
          >
            {state.my.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.my.map((n) => (
                  <Link
                    key={n}
                    to={`/synonyms/word/${n}`}
                    className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-300/40"
                  >
                    {WORDS[n - 1].word.toLowerCase()}
                  </Link>
                ))}
              </div>
            )}
          </Step>
          <Step
            n={2}
            title="Context practice"
            body="Don’t just memorise definitions. Use each word in different situations: education, environment, technology."
            progress={`${myByStage[1]}/${state.my.length || MY_LIST_MAX} words`}
            cta={{ to: '/synonyms/rewrite?set=my', label: 'Practise my words' }}
          />
          <Step
            n={3}
            title="Pressure testing"
            body="Use your five in timed writing. When they feel natural under pressure, add five more."
            progress={`${myByStage[2]}/${state.my.length || MY_LIST_MAX} words`}
            cta={{ to: '/synonyms/timed', label: 'Start a timed test' }}
          />
          <Step
            n={4}
            title="Integration"
            body="Keep expanding until you use two to five advanced words naturally in every essay."
            progress={`${myByStage[3]}/${state.my.length || MY_LIST_MAX} words`}
            cta={{ to: '/synonyms/scanner', label: 'Scan an essay' }}
          />
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">How IELTS marks vocabulary</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Lexical Resource</strong> is one of four equally weighted Writing criteria, so it
            is a quarter of your Writing band. Speaking is also marked on it.
          </li>
          <li>
            Examiners look at <strong className="text-ink">range, precision, natural collocation and style, and accurate
            spelling and word formation</strong>. A less common word only helps if you use it correctly. A forced or
            wrong word costs more than a plain word used well.
          </li>
          <li>
            IELTS does not count “advanced words” or check a list. The “two to five upgrades per essay” figure is the
            guide’s rule of thumb, not an official limit.
          </li>
          <li>
            British and American spelling are both accepted. Pick one and stay consistent. This site uses British
            spelling.
          </li>
          <li>
            This site is an independent study aid, not affiliated with IELTS, IDP, the British Council or Cambridge.
            Check the official public band descriptors on ielts.org.
          </li>
        </ul>
      </section>

      <AiStatusBanner />

      <section>
        <h2 className="text-lg font-semibold">Ways to practise</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <p className="text-2xl">{m.icon}</p>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                {m.title}
                {m.to === '/synonyms/flashcards' && due > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-ink">{due} due</span>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{m.blurb}</p>
            </Link>
          ))}
          <Link
            to="/synonyms/cheatsheet"
            className="rounded-2xl border border-dashed border-line bg-surface p-5 transition hover:border-brand-300"
          >
            <p className="text-2xl">🖨️</p>
            <p className="mt-2 font-semibold">Cheat sheet</p>
            <p className="mt-1 text-sm text-ink-soft">One printable page with every upgrade. Save it as a PDF.</p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Watch first</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The guide comes from IELTS Advantage. These two short videos explain the list and the memory method behind it.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <VideoEmbed id="8oYpg7Gb1QI" title="50 Synonyms You NEED To Know to Pass The IELTS Test" channel="IELTS Advantage" />
          <VideoEmbed id="vJ4hCKO3HtI" title="How Band 9 Students Easily Remember Vocabulary" channel="IELTS Advantage" />
        </div>
      </section>

      <section id="words" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">The 50 words</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Open a word to study it. Press ☆ to add it to your starting five (up to {MY_LIST_MAX} at a time).
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a word or an upgrade… e.g. “crucial”, “people”"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-500"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={!topic} onClick={() => setTopic('')}>
              All
            </Chip>
            {TOPIC_KEYS.map((t) => (
              <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>
                {TOPIC_LABEL[t]}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {results.length} word{results.length === 1 ? '' : 's'}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((w) => {
            const stages = stagesFor(state, w.n);
            const mine = inMy(w.n);
            return (
              <div
                key={w.n}
                className={`flex flex-col gap-2 rounded-xl border bg-surface p-4 shadow-sm transition hover:border-brand-300 ${
                  mine ? 'border-brand-500' : 'border-line'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/synonyms/word/${w.n}`} className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-soft">
                      {w.n}. <span className="uppercase tracking-wide">{w.pos}</span>
                    </p>
                    <p className="text-lg font-bold leading-tight">{w.word}</p>
                  </Link>
                  <button
                    onClick={() => {
                      if (!toggleMy(w.n)) setFull(true);
                      else setFull(false);
                    }}
                    aria-pressed={mine}
                    aria-label={mine ? `Remove ${w.word} from my words` : `Add ${w.word} to my words`}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base transition hover:bg-brand-50 ${
                      mine ? 'text-amber-ink' : 'text-ink-soft'
                    }`}
                  >
                    {mine ? '★' : '☆'}
                  </button>
                </div>
                <Link to={`/synonyms/word/${w.n}`} className="flex flex-wrap gap-1.5">
                  {w.syns.map((s) => (
                    <span key={s.w} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {s.w}
                    </span>
                  ))}
                </Link>
                <div className="mt-auto flex items-center gap-1 pt-1" title={`${stageCount(state, w.n)} of 4 steps`}>
                  {stages.map((done, i) => (
                    <span
                      key={i}
                      title={WORD_STAGES[i]}
                      className={`h-1.5 flex-1 rounded-full ${done ? 'bg-brand-500' : 'bg-brand-100'}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {full && (
          <p role="status" className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-ink">
            Your starting list is full ({MY_LIST_MAX} words). Remove one with ★ before adding another, or add five more once these feel natural.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Four traps to avoid</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DONTS.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <p className="font-semibold">❌ {title}</p>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          The goal isn’t to impress the examiner with big words. It’s to express your ideas clearly and precisely.
        </p>
      </section>

      <SynonymCredit />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  progress,
  cta,
  children,
}: {
  n: number;
  title: string;
  body: string;
  progress: string;
  cta: { to: string; label: string };
  children?: React.ReactNode;
}) {
  const isAnchor = cta.to.startsWith('#');
  const cls = 'mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline';
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-sm font-bold text-on-brand">{n}</span>
        <span className="text-xs font-semibold text-ink-soft">{progress}</span>
      </div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
      {children}
      {isAnchor ? (
        <a href={cta.to} onClick={(e) => { e.preventDefault(); document.getElementById('words')?.scrollIntoView({ behavior: 'smooth' }); }} className={cls}>
          {cta.label} →
        </a>
      ) : (
        <Link to={cta.to} className={cls}>
          {cta.label} →
        </Link>
      )}
    </li>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-line bg-surface text-ink-soft hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
