import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadSpeakingState } from '../../lib/speakingState';

const mocks = vi.hoisted(() => ({ failWith: null as null | { code: string; message: string }, transcript: '' }));

vi.mock('../../lib/voice', () => {
  class VoiceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  class AnswerCapture {
    onTranscript: ((t: string) => void) | null = null;
    async start() {
      if (mocks.failWith) throw new VoiceError(mocks.failWith.code, mocks.failWith.message);
    }
    async stop() {
      return { audioUrl: 'blob:answer', transcript: mocks.transcript, seconds: 40 };
    }
    cancel() {}
  }
  return { AnswerCapture, VoiceError, voiceSupport: () => ({ recording: true, transcript: true }) };
});

import { SpeakingStudio } from '../SpeakingStudio';

const setup = () =>
  render(
    <MemoryRouter>
      <SpeakingStudio />
    </MemoryRouter>,
  );

let user: ReturnType<typeof userEvent.setup>;

async function startPart1() {
  setup();
  await user.click(screen.getByLabelText('Part 1: personal questions'));
  await user.click(screen.getByLabelText(/Record my answers/));
  await user.click(screen.getByLabelText(/live transcript/i));
  await user.click(screen.getByRole('button', { name: 'Start practice' }));
  await user.click(screen.getByRole('button', { name: /Start recording my answer/ }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  user = userEvent.setup({ delay: null });
  localStorage.clear();
  reloadSpeakingState();
  mocks.failWith = null;
  mocks.transcript = '';
});
afterEach(() => vi.useRealTimers());

describe('SpeakingStudio with a microphone', () => {
  it('plays the recording back and reports pace, fillers and collocations from the transcript', async () => {
    // 100 words in 40 seconds = 150 wpm
    mocks.transcript = 'Um, I think public transport is important. ' + 'It helps to reduce traffic congestion. '.repeat(3) + 'well '.repeat(70) + ' um um';
    await startPart1();
    act(() => vi.advanceTimersByTime(1000));
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(screen.getByLabelText('Playback of your answer')).toHaveAttribute('src', 'blob:answer');
    expect(screen.getByText(/Fillers heard: .*um ×3/)).toBeInTheDocument();
    expect(screen.getByText('Pace').nextSibling).toHaveTextContent(/\d+ wpm/);
    expect(screen.getByText(/Collocations you used:/)).toBeInTheDocument();
    expect(screen.getByText(/Transcript/)).toBeInTheDocument();
  });

  it('revokes recordings when the learner leaves the page', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    mocks.transcript = 'a short answer';
    await startPart1();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(revoke).not.toHaveBeenCalled();
    cleanup(); // unmounts the page, as leaving it does
    expect(revoke).toHaveBeenCalledWith('blob:answer');
  });

  it('tells the learner when the microphone is blocked and lets them carry on without it', async () => {
    mocks.failWith = { code: 'denied', message: 'The browser blocked the microphone.' };
    await startPart1();
    // fell through to a timed answer rather than getting stuck
    expect(screen.getByRole('alert')).toHaveTextContent('The browser blocked the microphone.');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(25_000));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByText('No recording was made for this answer.')).toBeInTheDocument();
  });

  it('remembers the microphone choices between visits but never stores audio', async () => {
    await startPart1();
    const stored = JSON.parse(localStorage.getItem('ielts-speaking:v1')!);
    expect(stored).toMatchObject({ record: true, transcribe: true });
    expect(JSON.stringify(stored)).not.toContain('blob:');
  });
});
