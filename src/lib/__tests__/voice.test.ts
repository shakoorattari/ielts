import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnswerCapture, VoiceError, voiceSupport } from '../voice';

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: unknown;
  constructor(stream: unknown) {
    this.stream = stream;
    FakeRecorder.instances.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['abc']) });
    this.onstop?.();
  }
}

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  starts = 0;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.starts++;
  }
  stop() {}
}

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] };

beforeEach(() => {
  FakeRecorder.instances = [];
  track.stop.mockClear();
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn().mockResolvedValue(stream) }, configurable: true });
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe('voiceSupport', () => {
  it('reports recording and transcript support separately', () => {
    expect(voiceSupport()).toEqual({ recording: true, transcript: false });
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    expect(voiceSupport().transcript).toBe(true);
  });

  it('reports no recording when MediaRecorder is missing', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(voiceSupport().recording).toBe(false);
  });
});

describe('AnswerCapture', () => {
  it('records, returns a playable URL and releases the microphone', async () => {
    const c = new AnswerCapture({ record: true, transcribe: false });
    await c.start();
    const out = await c.stop();
    expect(out.audioUrl).toBe('blob:fake');
    expect(out.seconds).toBeGreaterThanOrEqual(0);
    expect(track.stop).toHaveBeenCalled();
  });

  it('maps a permission refusal to a "denied" error and frees the stream', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const c = new AnswerCapture({ record: true, transcribe: false });
    await expect(c.start()).rejects.toMatchObject({ code: 'denied' });
  });

  it('maps a missing microphone to "no-device"', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('none', 'NotFoundError'));
    await expect(new AnswerCapture({ record: true, transcribe: false }).start()).rejects.toMatchObject({ code: 'no-device' });
  });

  it('reports unsupported when asked to record without MediaRecorder', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const err = await new AnswerCapture({ record: true, transcribe: false }).start().catch((e) => e);
    expect(err).toBeInstanceOf(VoiceError);
    expect(err.code).toBe('unsupported');
  });

  it('collects final transcript, shows interim text live, and restarts after the browser ends a session', async () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const c = new AnswerCapture({ record: false, transcribe: true });
    const seen: string[] = [];
    c.onTranscript = (t) => seen.push(t);
    await c.start();
    const rec = FakeRecognition.last!;
    rec.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'hello there' } }, { isFinal: false, 0: { transcript: 'my fri' } }] });
    expect(seen.at(-1)).toBe('hello there my fri');
    rec.onend?.();
    expect(rec.starts).toBe(2);
    const out = await c.stop();
    expect(out.transcript).toBe('hello there');
    expect(out.audioUrl).toBeNull();
    rec.onend?.();
    expect(rec.starts).toBe(2); // does not restart after stop
  });

  it('cancel drops the audio and releases the microphone', async () => {
    const c = new AnswerCapture({ record: true, transcribe: false });
    await c.start();
    c.cancel();
    expect(track.stop).toHaveBeenCalled();
  });
});
