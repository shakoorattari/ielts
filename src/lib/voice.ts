/**
 * Microphone helpers for the Speaking Studio.
 *
 * Privacy: recording stays in the browser. The audio is held in memory as a Blob for playback and is never uploaded.
 * The optional live transcript uses the browser's SpeechRecognition, and in Chrome that sends the audio to Google's
 * speech service, so it is a separate opt-in and the UI says so.
 */

// The Web Speech API is not in TypeScript's DOM typings.
interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

const recognitionCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export interface VoiceSupport {
  recording: boolean;
  transcript: boolean;
}

export function voiceSupport(): VoiceSupport {
  return {
    recording: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
    transcript: typeof window !== 'undefined' && recognitionCtor() !== null,
  };
}

export type VoiceErrorCode = 'denied' | 'no-device' | 'unsupported' | 'failed';

export class VoiceError extends Error {
  code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export const VOICE_ERROR_TEXT: Record<VoiceErrorCode, string> = {
  denied: 'The browser blocked the microphone. Allow it for this site (the lock icon next to the address), or practise without recording.',
  'no-device': 'No microphone was found. Connect one, or practise without recording.',
  unsupported: 'This browser cannot record audio. You can still practise with the timers.',
  failed: 'The microphone could not be started. You can still practise with the timers.',
};

export interface Capture {
  /** Object URL for playback, or null if audio was not recorded. The caller must revoke it. */
  audioUrl: string | null;
  transcript: string;
  seconds: number;
}

export interface CaptureOptions {
  record: boolean;
  transcribe: boolean;
}

/** One answer's worth of microphone capture. Create one per answer. */
export class AnswerCapture {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recognition: RecognitionLike | null = null;
  private listening = false;
  private finalText = '';
  private startedAt = 0;
  private opts: CaptureOptions;
  /** Latest transcript including words not yet final, for showing live. */
  onTranscript: ((text: string) => void) | null = null;

  constructor(opts: CaptureOptions) {
    this.opts = opts;
  }

  async start(): Promise<void> {
    try {
      if (this.opts.record) {
        if (!voiceSupport().recording) throw new VoiceError('unsupported', VOICE_ERROR_TEXT.unsupported);
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recorder = new MediaRecorder(this.stream);
        this.recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) this.chunks.push(e.data);
        };
        this.recorder.start();
      }
      if (this.opts.transcribe) this.startRecognition();
      this.startedAt = performance.now();
    } catch (err) {
      this.releaseStream();
      throw toVoiceError(err);
    }
  }

  private startRecognition() {
    const Ctor = recognitionCtor();
    if (!Ctor) return; // optional: carry on without a transcript
    const rec = new Ctor();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += (this.finalText ? ' ' : '') + r[0].transcript.trim();
        else interim += r[0].transcript;
      }
      this.onTranscript?.((this.finalText + ' ' + interim).trim());
    };
    // Chrome ends a session after a pause; carry on while the learner is still answering.
    rec.onend = () => {
      if (this.listening) {
        try {
          rec.start();
        } catch {
          // already started
        }
      }
    };
    rec.onerror = () => {};
    this.recognition = rec;
    this.listening = true;
    rec.start();
  }

  async stop(): Promise<Capture> {
    const seconds = Math.max(0, (performance.now() - this.startedAt) / 1000);
    this.listening = false;
    try {
      this.recognition?.stop();
    } catch {
      // already stopped
    }

    let audioUrl: string | null = null;
    const rec = this.recorder;
    if (rec && rec.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
        rec.stop();
      });
    }
    if (this.chunks.length) audioUrl = URL.createObjectURL(new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' }));
    this.releaseStream();
    return { audioUrl, transcript: this.finalText.trim(), seconds };
  }

  /** Stop everything and drop the audio (leaving the page, skipping). */
  cancel() {
    this.listening = false;
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      // ignore
    }
    this.chunks = [];
    this.releaseStream();
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

function toVoiceError(err: unknown): VoiceError {
  if (err instanceof VoiceError) return err;
  const name = err instanceof DOMException || (typeof err === 'object' && err && 'name' in err) ? String((err as { name: unknown }).name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return new VoiceError('denied', VOICE_ERROR_TEXT.denied);
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new VoiceError('no-device', VOICE_ERROR_TEXT['no-device']);
  return new VoiceError('failed', VOICE_ERROR_TEXT.failed);
}
