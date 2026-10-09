import { useEffect, useMemo, useRef, useState } from 'react';
import { browserKind, describeAiError, isMobileDevice, useChromeAi, type NoApiHint } from '../lib/chromeAi';
import { useAiMode } from '../lib/aiEngine';
import { AiCloudSetup } from './AiCloudSetup';
import {
  explainDifferences,
  newExamples,
  reviewSentence,
  reviewText,
  REVIEW_CHAR_LIMIT,
  type Difference,
  type NewExample,
  type SentenceReview,
  type TextReview,
  type Verdict,
} from '../lib/aiCoach';
import { TOPIC_KEYS, TOPIC_LABEL, type SynWord } from '../lib/synonyms';

const CHROME_URL = 'https://www.google.com/chrome/';
const ON_DEVICE = 'Runs on your own computer through your browser’s built-in AI, so your writing is not sent to this site or to any server.';

/** The name to use in messages: Edge users shouldn’t be told about Chrome. */
const browserName = () => (browserKind() === 'edge' ? 'Edge' : 'Chrome');
const CAUTION = 'AI suggestions can be wrong. Check anything you are unsure about with a teacher.';

/** The accurate privacy sentence for whichever engine is running. */
function PrivacyNote() {
  const { mode, provider } = useAiMode();
  return mode === 'cloud' ? (
    <>Your writing is sent to {provider} (using your own key) to get this feedback. This site does not store it.</>
  ) : (
    <>{ON_DEVICE}</>
  );
}

/* ------------------------------------------------------------------ the gate */

const NO_API: Record<NoApiHint, string> = {
  mobile:
    'Chrome’s private on-device AI needs a computer (Windows, Mac or Linux), so it can’t run on phones and tablets yet. You can still get AI feedback here with your own free AI key, or open this page in Chrome on a computer.',
  'other-browser':
    'Want AI feedback that stays private? Open this page in Google Chrome on a computer: Chrome can run an AI on your own device. Or use your own free AI key below, which works in any browser.',
  edge:
    'Microsoft Edge’s private on-device AI is still a developer preview. It only exists in Edge Canary and Edge Dev, behind a setting, so regular Edge doesn’t have it yet. Open this page in Google Chrome on a computer for the private on-device AI, or use your own free AI key below, which works in Edge too.',
  'chromium-other':
    'This browser doesn’t offer a built-in AI yet. Open this page in Google Chrome on a computer for the private on-device AI, or use your own free AI key below, which works in any browser.',
  'old-chrome':
    'This browser doesn’t offer Chrome’s built-in AI yet. Update Chrome to the latest version (148 or newer) and reload, or open this page in Google Chrome on a computer.',
};

/** Edge Canary and Dev can run the same on-device AI once a flag is switched on. */
function EdgePreviewSteps() {
  return (
    <details className="mt-3 rounded-lg border border-line bg-surface p-3">
      <summary className="cursor-pointer font-semibold text-brand-700">Using Edge Canary or Edge Dev? Turn on the preview</summary>
      <ol className="mt-2 list-decimal pl-5">
        <li>
          Open a new tab and go to <code className="rounded bg-canvas px-1">edge://flags</code>.
        </li>
        <li>Search for “Prompt API for on-device language model” and set it to Enabled.</li>
        <li>Restart Edge, then come back to this page and press “Turn on the AI coach”.</li>
      </ol>
      <p className="mt-2 text-xs">
        Needs Windows 10 or 11, or macOS 13.3 or later, about 20 GB of free disk space, and a graphics card with at least 5.5 GB of
        memory. It is a developer preview, so it may change.
      </p>
    </details>
  );
}

/**
 * Shows the AI coach when Chrome can run it, and otherwise explains why not and what to do (open Chrome,
 * update, or turn on the one-time download). The rest of the site never depends on it.
 */
export function AiGate({ children, inline = false, showLabel = true }: { children: () => React.ReactNode; inline?: boolean; showLabel?: boolean }) {
  const { state, enable } = useChromeAi();
  const { mode } = useAiMode();
  const [copied, setCopied] = useState(false);

  // On-device AI wins when Chrome can run it; otherwise a learner's own free key works on any device.
  if (mode !== 'none') return <>{children()}</>;
  if (state.kind === 'checking') return null;

  const wrap = inline
    ? 'mt-3 rounded-lg border border-dashed border-line bg-canvas p-3 text-sm text-ink-soft'
    : 'rounded-2xl border border-dashed border-line bg-surface p-4 text-sm text-ink-soft';

  let body: React.ReactNode;
  if (state.kind === 'no-api') {
    body = (
      <>
        <p>{NO_API[state.hint]}</p>
        {state.hint === 'edge' && <EdgePreviewSteps />}
        {state.hint !== 'mobile' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={CHROME_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand-700 hover:border-brand-300"
            >
              Get Google Chrome
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand-700 hover:border-brand-300"
            >
              {copied ? 'Link copied. Paste it into Chrome' : 'Copy this page’s link'}
            </button>
          </div>
        )}
      </>
    );
  } else if (state.kind === 'unavailable' && isMobileDevice()) {
    // Android Chrome can report the API as "unavailable". Say the true reason and lead with the key option.
    body = <p>{NO_API.mobile}</p>;
  } else if (state.kind === 'unavailable') {
    body = (
      <p>
        {browserName()}’s built-in AI can’t run on this computer. It needs a recent Windows or Mac (or Linux in Chrome) with about 20 GB
        of free disk space and a capable graphics card or enough memory. You can still use your own free AI key below. The rest of
        the site works fully.
      </p>
    );
  } else if (state.kind === 'downloadable') {
    body = (
      <>
        <p>
          Turn on the AI coach. {browserName()} will download its on-device AI model once (several gigabytes, and it needs about 20 GB
          of free disk space). {ON_DEVICE}
        </p>
        {state.error && <p className="mt-2 text-rose-ink">{state.error}</p>}
        <button
          type="button"
          onClick={enable}
          className="mt-3 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600"
        >
          ✨ Turn on the AI coach
        </button>
      </>
    );
  } else if (state.kind === 'downloading') {
    const pct = state.progress === null ? null : Math.round(state.progress * 100);
    body = (
      <div role="status">
        <p>{browserName()} is downloading the AI model{pct === null ? '…' : `: ${pct}%`}. You can keep using the site meanwhile.</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-50">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct ?? 5}%` }} />
        </div>
      </div>
    );
  } else {
    return null; // ready: handled above
  }

  return (
    <div className={wrap}>
      {showLabel && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">✨ AI coach (beta)</p>}
      {body}
      {state.kind !== 'downloading' && (
        <AiCloudSetup defaultOpen={(state.kind === 'no-api' && state.hint === 'mobile') || (state.kind === 'unavailable' && isMobileDevice())} />
      )}
    </div>
  );
}

/** A banner for the synonyms home: always explains what the AI coach is and what this browser can do. */
export function AiStatusBanner() {
  const { mode, provider } = useAiMode();
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">✨ AI coach (beta)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Get feedback on your own sentences and essays: is the word natural, and what would be stronger? You’ll see ✨ buttons on the
        rewrite drill, the essay scanner, the timed test and each word page.
      </p>
      {mode === 'on-device' && (
        <p className="mt-3 rounded-lg bg-mint-100 px-3 py-2 text-sm text-mint-ink" role="status">
          On and ready in this browser. {ON_DEVICE}
        </p>
      )}
      {mode === 'cloud' && (
        <div className="mt-3">
          <p className="rounded-lg bg-mint-100 px-3 py-2 text-sm text-mint-ink" role="status">
            On, using your own {provider} key. Your writing is sent to {provider} when you press a ✨ button.
          </p>
          <AiCloudSetup />
        </div>
      )}
      {mode === 'none' && (
        <div className="mt-3">
          <AiGate inline showLabel={false}>
            {() => null}
          </AiGate>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">{CAUTION} It checks vocabulary only and never gives an IELTS band score.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ running a task */

type Status = 'idle' | 'loading' | 'done' | 'error';

function useAiTask<T>() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  async function run(task: (signal: AbortSignal) => Promise<T>) {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setStatus('loading');
    setError('');
    try {
      const r = await task(c.signal);
      if (c.signal.aborted) return;
      setResult(r);
      setStatus('done');
    } catch (e) {
      if (c.signal.aborted) return;
      setError(describeAiError(e));
      setStatus('error');
    }
  }

  return { status, result, error, run };
}

function AskButton({ onClick, loading, children, disabled }: { onClick: () => void; loading: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-50"
    >
      {loading ? '✨ Thinking…' : children}
    </button>
  );
}

const VERDICT: Record<Verdict, { label: string; tone: string }> = {
  natural: { label: 'Natural', tone: 'bg-mint-100 text-mint-ink' },
  acceptable: { label: 'Acceptable, but could be stronger', tone: 'bg-brand-100 text-brand-700' },
  unnatural: { label: 'Sounds unnatural', tone: 'bg-amber-100 text-amber-ink' },
};

/* ------------------------------------------------------------------ a rewritten sentence */

export function AiSentenceReview(props: { plain: string; base: string; word: SynWord; learner: string }) {
  return <AiGate inline>{() => <SentenceBody {...props} />}</AiGate>;
}

function SentenceBody({ plain, base, word, learner }: { plain: string; base: string; word: SynWord; learner: string }) {
  const task = useAiTask<SentenceReview>();
  const r = task.result;
  return (
    <div className="mt-3 border-t border-line/60 pt-3">
      {task.status !== 'done' && (
        <AskButton loading={task.status === 'loading'} onClick={() => task.run((signal) => reviewSentence({ plain, base, word, learner }, signal))}>
          ✨ Ask the AI coach about my sentence
        </AskButton>
      )}
      {task.status === 'error' && (
        <p className="mt-2 text-sm text-rose-ink" role="alert">
          {task.error}
        </p>
      )}
      {task.status === 'done' && r && (
        <div role="status" className="flex flex-col gap-2 text-sm text-ink">
          <p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT[r.verdict].tone}`}>{VERDICT[r.verdict].label}</span>
          </p>
          <p>{r.explanation}</p>
          <p>
            <span className="font-semibold">Suggested: </span>
            {r.better}
          </p>
          <p className="text-xs text-ink-soft">
            {CAUTION} <PrivacyNote />
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ a paragraph or essay */

export function AiTextReview({ text, label = 'Get AI vocabulary feedback' }: { text: string; label?: string }) {
  return (
    <AiGate>
      {() => <TextBody key={text} text={text} label={label} />}
    </AiGate>
  );
}

function TextBody({ text, label }: { text: string; label: string }) {
  const task = useAiTask<{ review: TextReview; truncated: boolean }>();
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const out = task.result;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="font-semibold">✨ AI vocabulary feedback (beta)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        The coach reads your writing and points out word choices that sound unnatural, too informal or repetitive. It checks
        vocabulary only, not grammar, and never gives a band score. <PrivacyNote />
      </p>
      <div className="mt-3">
        <AskButton loading={task.status === 'loading'} disabled={words < 8} onClick={() => task.run((signal) => reviewText(text, signal))}>
          ✨ {task.status === 'done' ? 'Ask again' : label}
        </AskButton>
        {words < 8 && <span className="ml-3 text-xs text-ink-soft">Write a few sentences first.</span>}
      </div>
      {task.status === 'error' && (
        <p className="mt-3 text-sm text-rose-ink" role="alert">
          {task.error}
        </p>
      )}
      {task.status === 'done' && out && (
        <div role="status" className="mt-4 flex flex-col gap-4 text-sm">
          {out.truncated && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-ink">
              Your text is long, so the coach reviewed roughly the first {REVIEW_CHAR_LIMIT} characters. Paste the rest in a second piece
              to review it too.
            </p>
          )}
          {out.review.strengths.length > 0 && (
            <div>
              <p className="font-semibold text-mint-ink">Doing well</p>
              <ul className="mt-1 list-disc pl-5">
                {out.review.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="font-semibold">Worth a second look</p>
            {out.review.issues.length === 0 ? (
              <p className="mt-1 text-ink-soft">The coach didn’t find any word choices to flag in this part.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {out.review.issues.map((i) => (
                  <li key={i.quote} className="rounded-lg bg-canvas p-3">
                    <p>
                      <mark className="rounded bg-amber-100 px-1 text-amber-ink">{i.quote}</mark>
                    </p>
                    <p className="mt-1">{i.problem}</p>
                    {i.fix && (
                      <p className="mt-1">
                        <span className="font-semibold">Try: </span>
                        {i.fix}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {out.review.tip && (
            <p className="rounded-lg bg-brand-50 p-3">
              <span className="font-semibold text-brand-700">💡 Tip. </span>
              {out.review.tip}
            </p>
          )}
          <p className="text-xs text-ink-soft">{CAUTION}</p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ a word page */

export function AiWordCoach({ word }: { word: SynWord }) {
  return <AiGate>{() => <WordBody word={word} />}</AiGate>;
}

function WordBody({ word }: { word: SynWord }) {
  const [topic, setTopic] = useState('education');
  const examples = useAiTask<NewExample[]>();
  const difference = useAiTask<Difference>();
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold">✨ AI coach (beta)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Ask for fresh example sentences on a topic you choose, or a short explanation of when to pick each upgrade. <PrivacyNote />
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Topic for the new examples"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {TOPIC_KEYS.filter((t) => t !== 'general').map((t) => (
              <option key={t} value={t}>
                {TOPIC_LABEL[t]}
              </option>
            ))}
          </select>
          <AskButton loading={examples.status === 'loading'} onClick={() => examples.run((signal) => newExamples(word, topic, 3, signal))}>
            ✨ New example sentences
          </AskButton>
        </div>
        {examples.status === 'error' && (
          <p className="text-sm text-rose-ink" role="alert">
            {examples.error}
          </p>
        )}
        {examples.status === 'done' && examples.result && (
          <div role="status">
            {examples.result.length === 0 ? (
              <p className="text-sm text-ink-soft">The coach couldn’t write a usable sentence this time. Try again.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {examples.result.map((e) => (
                  <li key={e.sentence} className="rounded-lg bg-canvas p-3 text-sm leading-relaxed">
                    {e.sentence} <span className="whitespace-nowrap text-xs font-semibold text-brand-700">({e.syn})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <AskButton loading={difference.status === 'loading'} onClick={() => difference.run((signal) => explainDifferences(word, signal))}>
            ✨ When do I use which?
          </AskButton>
        </div>
        {difference.status === 'error' && (
          <p className="text-sm text-rose-ink" role="alert">
            {difference.error}
          </p>
        )}
        {difference.status === 'done' && difference.result && (
          <div role="status" className="text-sm">
            {difference.result.summary && <p className="mb-2">{difference.result.summary}</p>}
            <ul className="flex flex-col gap-1.5">
              {difference.result.usage.map((u) => (
                <li key={u.syn}>
                  <strong>{u.syn}</strong>: {u.when}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-ink-soft">
          {CAUTION} Compare with the guide’s notes above, which are the reference.
        </p>
      </div>
    </section>
  );
}
