import { useState } from 'react';
import { speakable } from '../lib/synonyms';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function bestVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en-GB')) ?? voices.find((v) => v.lang.startsWith('en'))
  );
}

/** Reads a word or sentence aloud with the browser's built-in voice. Hidden where speech isn't supported. */
export function SpeakButton({ text, label, className = '' }: { text: string; label?: string; className?: string }) {
  const [speaking, setSpeaking] = useState(false);
  if (!supported) return null;

  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    const voice = bestVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = 0.92;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label ?? `Listen: ${text}`}
      title="Listen"
      className={`inline-grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm transition hover:bg-brand-50 ${
        speaking ? 'bg-brand-100 text-brand-700' : 'text-ink-soft'
      } ${className}`}
    >
      🔊
    </button>
  );
}
