import { useEffect, useMemo, useRef, useState } from 'react';
import { SpeakButton } from '../components/SpeakButton';
import { CUE_CARDS, PART1 } from '../data/speaking';
import { formatBand, overallBand } from '../lib/bands';
import { ALL_ITEMS } from '../lib/collocations';
import { PREP_SECONDS, buildSteps } from '../lib/speakingSession';
import type { Step } from '../lib/speakingSession';
import { useSpeakingState } from '../lib/speakingState';
import type { SpeakingMode } from '../lib/speakingState';
import { countFillers, fmtDuration, lengthVerdict, paceVerdict, TARGET_SECONDS, wordsPerMinute } from '../lib/speakingStats';
import { AnswerCapture, VoiceError, voiceSupport } from '../lib/voice';
import { collocationsUsed, wordsOf } from '../lib/writingAnalysis';

interface Result {
  step: Step;
  seconds: number;
  transcript: string;
  audioUrl: string | null;
}

type Phase = 'prep' | 'ready' | 'speaking' | 'review';
type View = 'setup' | 'run' | 'summary';

const MODE_LABEL: Record<SpeakingMode, string> = {
  part1: 'Part 1: personal questions',
  part2: 'Part 2: long turn (cue card)',
  part3: 'Part 3: discussion',
  mock: 'Full mock test (all three parts)',
};

const SPEAKING_CRITERIA = ['Fluency and Coherence', 'Lexical Resource', 'Grammatical Range and Accuracy', 'Pronunciation'] as const;
const LEVELS = [4, 5, 6, 7, 8, 9];

/** Plain-words paraphrases of the public IELTS Speaking band descriptors. */
const DESCRIPTORS: Record<(typeof SPEAKING_CRITERIA)[number], Record<number, string>> = {
  'Fluency and Coherence': {
    4: 'Frequent pauses and repetition; answers are short and ideas are hard to connect.',
    5: 'You keep going but with repetition, self-correction or slow speech, and you over-use simple linking words.',
    6: 'You are willing to speak at length, though hesitation and repetition sometimes cost coherence.',
    7: 'You speak at length without much effort, with some hesitation, and use a range of linking words.',
    8: 'Fluent, with only occasional repetition. Hesitation is mostly about finding the idea, not the words.',
    9: 'Fluent and fully coherent. Hesitation is rare and natural.',
  },
  'Lexical Resource': {
    4: 'Basic vocabulary on familiar topics; you struggle with anything unfamiliar.',
    5: 'You can talk about familiar and some unfamiliar topics, but with little flexibility or paraphrase.',
    6: 'Wide enough to discuss topics at length, despite some wrong word choices. You can paraphrase.',
    7: 'You use vocabulary flexibly, with some less common and idiomatic items and awareness of collocation.',
    8: 'A wide resource used readily, including uncommon and idiomatic words, with only occasional slips.',
    9: 'Precise, natural vocabulary in every context.',
  },
  'Grammatical Range and Accuracy': {
    4: 'Mostly short, simple sentences; errors are frequent and can cause misunderstanding.',
    5: 'Basic forms are fairly well controlled. Complex sentences are limited and usually contain errors.',
    6: 'A mix of simple and complex structures. Errors are frequent in complex ones but rarely block meaning.',
    7: 'A range of structures used flexibly. Many sentences are error-free; some errors persist.',
    8: 'A wide range of structures; most sentences are error-free.',
    9: 'Full range used naturally and accurately.',
  },
  Pronunciation: {
    4: 'Some clear features but a limited range; mispronunciation strains the listener at times.',
    5: 'Between bands 4 and 6: understandable most of the time, with noticeable strain.',
    6: 'A range of features with mixed control. You can generally be understood, though clarity drops at times.',
    7: 'Between bands 6 and 8: clear most of the time with good use of stress and intonation.',
    8: 'A wide range of features used flexibly. Easily understood; accent has very little effect.',
    9: 'A full range of features sustained naturally.',
  },
};

const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500';
const btnPrimary = 'rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-600 disabled:opacity-50';
const btnGhost = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-brand-300 disabled:opacity-50';

export function SpeakingStudio() {
  const sp = useSpeakingState();
  const support = useMemo(() => voiceSupport(), []);

  const [view, setView] = useState<View>('setup');
  const [mode, setMode] = useState<SpeakingMode>('mock');
  const [topicId, setTopicId] = useState('');
  const [cardId, setCardId] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [results, setResults] = useState<Result[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const capture = useRef<AnswerCapture | null>(null);
  const phaseStart = useRef(0);
  const urls = useRef<string[]>([]);
  const stopping = useRef(false);

  const step = steps[index];
  const record = sp.state.record && support.recording;
  const transcribe = sp.state.transcribe && support.transcript;

  // Always call the latest handlers from the timer.
  const latest = useRef({ goReady: () => {}, stopSpeaking: () => {} });

  useEffect(() => {
    if (view !== 'run' || (phase !== 'prep' && phase !== 'speaking')) return;
    phaseStart.current = Date.now();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - phaseStart.current) / 1000);
      setElapsed(s);
      if (phase === 'prep' && s >= PREP_SECONDS) latest.current.goReady();
      if (phase === 'speaking' && step?.limitSec && s >= step.limitSec) latest.current.stopSpeaking();
    }, 250);
    return () => clearInterval(id);
  }, [view, phase, step]);

  // Free the microphone and any recordings when leaving the page.
  useEffect(() => {
    const created = urls.current;
    const cap = capture;
    return () => {
      cap.current?.cancel();
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  function start() {
    const built = buildSteps(mode, topicId, cardId);
    setSteps(built);
    setIndex(0);
    setResults([]);
    beginStep(built[0]);
    setView('run');
  }

  function beginStep(s: Step) {
    setElapsed(0);
    setNotes('');
    setLiveText('');
    setError('');
    setPhase(s.prepSec > 0 ? 'prep' : 'ready');
  }

  function goReady() {
    setElapsed(0);
    setPhase('ready');
  }

  async function startSpeaking() {
    if (busy) return;
    setError('');
    setLiveText('');
    setBusy(true);
    stopping.current = false;
    if (record || transcribe) {
      const cap = new AnswerCapture({ record, transcribe });
      cap.onTranscript = setLiveText;
      try {
        await cap.start();
        capture.current = cap;
      } catch (e) {
        capture.current = null;
        setError(e instanceof VoiceError ? e.message : 'The microphone could not be started. You can still practise with the timers.');
      }
    }
    setBusy(false);
    setElapsed(0);
    setPhase('speaking');
  }

  async function stopSpeaking() {
    if (stopping.current || phase !== 'speaking') return;
    stopping.current = true;
    const timed = Math.floor((Date.now() - phaseStart.current) / 1000);
    let result: Result;
    const cap = capture.current;
    capture.current = null;
    if (cap) {
      const out = await cap.stop();
      if (out.audioUrl) urls.current.push(out.audioUrl);
      result = { step, seconds: Math.round(out.seconds) || timed, transcript: out.transcript, audioUrl: out.audioUrl };
    } else {
      result = { step, seconds: timed, transcript: '', audioUrl: null };
    }
    setResults((r) => [...r.filter((x) => x.step !== step), result]);
    setPhase('review');
  }
  latest.current = { goReady, stopSpeaking: () => void stopSpeaking() };

  function redo() {
    setResults((r) => r.filter((x) => x.step !== step));
    beginStep({ ...step, prepSec: 0 });
  }

  function next() {
    if (index + 1 >= steps.length) {
      setView('summary');
      return;
    }
    setIndex(index + 1);
    beginStep(steps[index + 1]);
  }

  function leave() {
    capture.current?.cancel();
    capture.current = null;
    setView('setup');
  }

  if (view === 'setup') {
    return (
      <Setup
        mode={mode}
        setMode={setMode}
        topicId={topicId}
        setTopicId={setTopicId}
        cardId={cardId}
        setCardId={setCardId}
        onStart={start}
        support={support}
        sp={sp}
      />
    );
  }

  if (view === 'summary') {
    return <Summary mode={mode} results={results} onAgain={() => setView('setup')} sp={sp} />;
  }

  if (!step) return null;
  const result = results.find((r) => r.step === step);
  const [minS, maxS] = TARGET_SECONDS[step.part];

  return (
    <div className="flex flex-col gap-5 animate-pop">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Speaking studio</h1>
        <p className="text-sm text-ink-soft" data-testid="progress">
          Question {index + 1} of {steps.length} · Part {step.part}
        </p>
        <button onClick={leave} className={btnGhost}>
          End session
        </button>
      </div>

      <section aria-label="Question" className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-lg font-semibold leading-snug" data-testid="prompt">
            {step.prompt}
          </p>
          <SpeakButton text={step.card ? `${step.card.title} You should say: ${step.card.say.join(', ')}. And explain ${step.card.explain}` : step.prompt} label="Hear the question" />
        </div>
        {step.card && (
          <div className="mt-3 text-sm">
            <p className="font-medium">You should say:</p>
            <ul className="mt-1 list-disc pl-5">
              {step.card.say.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-1">and explain {step.card.explain}</p>
          </div>
        )}
      </section>

      {phase === 'prep' && (
        <section aria-label="Preparation" className="flex flex-col gap-3">
          <p className="text-sm" role="timer" data-testid="prep-clock">
            Preparation time: <strong className="font-mono text-lg tabular-nums">{fmtDuration(Math.max(0, PREP_SECONDS - elapsed))}</strong>
          </p>
          <label htmlFor="prep-notes" className="text-sm font-semibold">
            Make brief notes (keywords, not sentences)
          </label>
          <textarea id="prep-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={`${field} w-full`} />
          <div>
            <button onClick={goReady} className={btnPrimary}>
              I am ready to speak
            </button>
          </div>
        </section>
      )}

      {phase === 'ready' && (
        <section aria-label="Ready to answer" className="flex flex-col gap-3">
          {notes && (
            <div className="rounded-xl border border-line bg-surface p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Your notes</p>
              <p className="mt-1 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          <p className="text-sm text-ink-soft">
            {step.part === 2 ? `Aim to speak for the full two minutes (at least ${fmtDuration(minS)}).` : `A good answer is about ${minS} to ${maxS} seconds: give a reason or an example, not just yes or no.`}
          </p>
          {error && (
            <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-100 p-3 text-sm text-amber-ink">
              {error}
            </p>
          )}
          <div>
            <button onClick={() => void startSpeaking()} disabled={busy} className={btnPrimary}>
              {busy ? 'Starting…' : record ? '● Start recording my answer' : 'Start my answer'}
            </button>
          </div>
        </section>
      )}

      {phase === 'speaking' && (
        <section aria-label="Answering" className="flex flex-col gap-3">
          <p className="text-sm" role="timer" data-testid="speak-clock">
            <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
            Speaking: <strong className="font-mono text-lg tabular-nums">{fmtDuration(elapsed)}</strong>
            {step.limitSec ? <span className="text-ink-soft"> / {fmtDuration(step.limitSec)}</span> : null}
          </p>
          {error && (
            <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-100 p-3 text-sm text-amber-ink">
              {error}
            </p>
          )}
          {transcribe && (
            <p className="min-h-12 rounded-xl border border-line bg-surface p-3 text-sm text-ink-soft" aria-live="off">
              {liveText || 'Your words will appear here as you speak…'}
            </p>
          )}
          <div>
            <button onClick={() => void stopSpeaking()} className={btnPrimary}>
              Stop
            </button>
          </div>
        </section>
      )}

      {phase === 'review' && result && <Review result={result} onRedo={redo} onNext={next} last={index + 1 >= steps.length} />}
    </div>
  );
}

function Review({ result, onRedo, onNext, last }: { result: Result; onRedo: () => void; onNext: () => void; last: boolean }) {
  const { step, seconds, transcript, audioUrl } = result;
  const words = wordsOf(transcript).length;
  const wpm = transcript ? wordsPerMinute(words, seconds) : null;
  const fillers = useMemo(() => countFillers(transcript), [transcript]);
  const colls = useMemo(() => collocationsUsed(transcript, ALL_ITEMS), [transcript]);
  const len = lengthVerdict(step.part, seconds);
  const [minS, maxS] = TARGET_SECONDS[step.part];

  const lengthText = {
    short: `Shorter than the ${minS} to ${maxS} seconds a strong answer usually takes. Add a reason, an example or a detail.`,
    good: `A good length (target ${minS} to ${maxS} seconds).`,
    long: 'Longer than needed. Keep answers focused so the examiner can move on.',
  }[len];

  return (
    <section aria-label="Review your answer" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Your answer</h2>
      {audioUrl ? <audio controls src={audioUrl} className="w-full" aria-label="Playback of your answer" /> : <p className="text-sm text-ink-soft">No recording was made for this answer.</p>}
      <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <Fact label="Time" value={fmtDuration(seconds)} />
        <Fact label="Words" value={transcript ? words : '–'} />
        <Fact label="Pace" value={wpm === null ? '–' : `${wpm} wpm`} />
        <Fact label="Fillers" value={transcript ? fillers.reduce((n, f) => n + f.count, 0) : '–'} />
      </dl>
      <ul className="flex flex-col gap-1.5 text-sm">
        <li className={len === 'good' ? 'text-mint-ink' : 'text-amber-ink'} data-testid="length-note">
          {lengthText}
        </li>
        {wpm !== null && words >= 20 && (
          <li className={paceVerdict(wpm) === 'natural' ? 'text-mint-ink' : 'text-amber-ink'}>
            {paceVerdict(wpm) === 'natural' && 'Your pace is natural and easy to follow.'}
            {paceVerdict(wpm) === 'slow' && 'Your pace is slow. Fluent speech is closer to 110 to 170 words a minute. Try to link ideas instead of pausing between them.'}
            {paceVerdict(wpm) === 'fast' && 'Your pace is fast. Slow down a little so each word is clear.'}
          </li>
        )}
        {fillers.length > 0 && <li className="text-amber-ink">Fillers heard: {fillers.map((f) => `${f.filler} ×${f.count}`).join(', ')}. A short silent pause sounds better than “um”.</li>}
        {colls.length > 0 && <li className="text-mint-ink">Collocations you used: {colls.map((c) => c.term).join(', ')}.</li>}
      </ul>
      {transcript && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Transcript (the browser’s guess, it can be wrong)</summary>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-canvas p-3 text-sm">{transcript}</p>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={onRedo} className={btnGhost}>
          Try this question again
        </button>
        <button onClick={onNext} className={btnPrimary}>
          {last ? 'Finish' : 'Next question'}
        </button>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

type Sp = ReturnType<typeof useSpeakingState>;

function Setup(props: {
  mode: SpeakingMode;
  setMode: (m: SpeakingMode) => void;
  topicId: string;
  setTopicId: (s: string) => void;
  cardId: string;
  setCardId: (s: string) => void;
  onStart: () => void;
  support: ReturnType<typeof voiceSupport>;
  sp: Sp;
}) {
  const { mode, setMode, topicId, setTopicId, cardId, setCardId, onStart, support, sp } = props;
  const needsTopic = mode === 'part1' || mode === 'mock';
  const needsCard = mode !== 'part1';

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Speaking studio</h1>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Practise the three parts of the Speaking test with real timings: short personal questions, a cue card with one
          minute to prepare and up to two minutes to speak, then a discussion. Record yourself and listen back, which is
          the quickest way to hear hesitation and repeated words.
        </p>
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <legend className="px-1 text-sm font-semibold">What do you want to practise?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(MODE_LABEL) as SpeakingMode[]).map((m) => (
            <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${mode === m ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-300'}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="accent-brand-500" />
              {MODE_LABEL[m]}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {needsTopic && (
            <div className="flex flex-col gap-1">
              <label htmlFor="topic" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Part 1 topic
              </label>
              <select id="topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className={field}>
                <option value="">Surprise me</option>
                {PART1.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needsCard && (
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="card" className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Cue card
              </label>
              <select id="card" value={cardId} onChange={(e) => setCardId(e.target.value)} className={`${field} max-w-full`}>
                <option value="">Surprise me</option>
                {CUE_CARDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title.replace(/^Describe /, '').replace(/\.$/, '')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <legend className="px-1 text-sm font-semibold">Microphone (optional)</legend>
        <div className="mt-2 flex flex-col gap-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={sp.state.record && support.recording}
              disabled={!support.recording}
              onChange={(e) => sp.setRecord(e.target.checked)}
              className="mt-0.5 accent-brand-500"
            />
            <span>
              <strong>Record my answers for playback.</strong> The recording stays in your browser and is deleted when you
              leave this page. Nothing is uploaded.
              {!support.recording && <span className="block text-ink-soft">This browser cannot record audio, so the timers still work without it.</span>}
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={sp.state.transcribe && support.transcript}
              disabled={!support.transcript}
              onChange={(e) => sp.setTranscribe(e.target.checked)}
              className="mt-0.5 accent-brand-500"
            />
            <span>
              <strong>Show a live transcript and speaking pace.</strong> Privacy note: in Chrome and Edge the browser sends
              your voice to its speech service (Google or Microsoft) to turn it into text. Leave this off if you would
              rather not share your voice.
              {!support.transcript && <span className="block text-ink-soft">This browser does not offer speech-to-text. Chrome or Edge on a computer do.</span>}
            </span>
          </label>
        </div>
      </fieldset>

      <div>
        <button onClick={onStart} className={btnPrimary}>
          Start practice
        </button>
      </div>

      {sp.state.attempts.length > 0 && (
        <section aria-labelledby="sp-hist" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 id="sp-hist" className="text-lg font-semibold">
            Past sessions
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {[...sp.state.attempts].reverse().map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 py-2 text-sm">
                <span className="text-ink-soft">{new Date(a.at).toLocaleDateString()}</span>
                <span>{MODE_LABEL[a.mode]}</span>
                <span>
                  {a.answers} answer{a.answers === 1 ? '' : 's'}, {fmtDuration(a.seconds)}
                </span>
                <span className="font-medium">{a.band === null ? 'not rated' : `band ${formatBand(a.band)}`}</span>
                <button
                  onClick={() => sp.deleteAttempt(a.id)}
                  className="ml-auto rounded px-2 py-1 text-xs text-ink-soft hover:text-rose-ink"
                  aria-label={`Delete session from ${new Date(a.at).toLocaleDateString()}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Summary({ mode, results, onAgain, sp }: { mode: SpeakingMode; results: Result[]; onAgain: () => void; sp: Sp }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const total = results.reduce((n, r) => n + r.seconds, 0);
  const rated = SPEAKING_CRITERIA.every((c) => ratings[c]);
  const band = rated ? overallBand(SPEAKING_CRITERIA.map((c) => ratings[c])) : null;

  return (
    <div className="flex flex-col gap-6 animate-pop">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session complete</h1>
        <p className="mt-1 text-ink-soft" data-testid="summary-line">
          You gave {results.length} answer{results.length === 1 ? '' : 's'} in {fmtDuration(total)}.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface p-3 text-sm">
            <p className="font-medium">
              Part {r.step.part}: {r.step.prompt}
            </p>
            <p className="mt-0.5 text-ink-soft">
              {fmtDuration(r.seconds)}
              {r.transcript && ` · ${wordsOf(r.transcript).length} words`}
            </p>
            {r.audioUrl && <audio controls src={r.audioUrl} className="mt-2 w-full" aria-label={`Playback: ${r.step.prompt}`} />}
          </li>
        ))}
      </ul>

      <section aria-labelledby="sp-rate" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 id="sp-rate" className="text-lg font-semibold">
          Rate yourself like an examiner
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Listen to your recording first. Be strict, and pick the lower level when unsure. Pronunciation is the hardest to judge alone: ask a teacher or a friend if you can.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SPEAKING_CRITERIA.map((c) => (
            <div key={c} className="flex flex-col gap-2">
              <label htmlFor={`sr-${c}`} className="text-sm font-semibold">
                {c}
              </label>
              <select id={`sr-${c}`} value={ratings[c] ?? ''} onChange={(e) => setRatings({ ...ratings, [c]: Number(e.target.value) })} className={field}>
                <option value="" disabled>
                  Choose a level…
                </option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === 4 ? 'Band 4 or below' : `Band ${l}`}
                  </option>
                ))}
              </select>
              <p className="min-h-10 text-xs text-ink-soft">{ratings[c] ? DESCRIPTORS[c][ratings[c]] : 'Pick a level to read what it looks like.'}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm" aria-live="polite" data-testid="speaking-estimate">
            {band === null ? 'Rate all four criteria to see your self-assessed band.' : <>Self-assessed Speaking band: <strong className="text-xl text-brand-500">{formatBand(band)}</strong></>}
          </p>
          <button
            className={`${btnPrimary} ml-auto`}
            disabled={saved}
            onClick={() => {
              sp.saveAttempt({ mode, answers: results.length, seconds: total, band });
              setSaved(true);
            }}
          >
            {saved ? 'Saved ✓' : 'Save this session'}
          </button>
        </div>
      </section>

      <div>
        <button onClick={onAgain} className={btnGhost}>
          Practise again
        </button>
      </div>
    </div>
  );
}
