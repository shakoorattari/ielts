import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { SpeakingStudio } from '../SpeakingStudio';
import { reloadSpeakingState } from '../../lib/speakingState';

const setup = () =>
  render(
    <MemoryRouter>
      <SpeakingStudio />
    </MemoryRouter>,
  );

let user: ReturnType<typeof userEvent.setup>;
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  // Only the clock and interval are faked: Testing Library's own waiting relies on a real setTimeout.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  user = userEvent.setup({ delay: null });
  reloadSpeakingState();
});
afterEach(() => vi.useRealTimers());

describe('SpeakingStudio setup', () => {
  it('offers the four practice modes and hides the microphone options the browser cannot honour', () => {
    setup();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    // jsdom has no MediaRecorder or SpeechRecognition
    expect(screen.getByLabelText(/Record my answers/)).toBeDisabled();
    expect(screen.getByLabelText(/live transcript/i)).toBeDisabled();
  });

  it('has no detectable accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('SpeakingStudio part 1 flow', () => {
  it('walks through five questions, times each answer, and saves a rated session', async () => {
    setup();
    await user.click(screen.getByLabelText('Part 1: personal questions'));
    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId('progress')).toHaveTextContent(`Question ${i} of 5 · Part 1`);
      await user.click(screen.getByRole('button', { name: 'Start my answer' }));
      tick(20_000);
      expect(screen.getByTestId('speak-clock')).toHaveTextContent('0:20');
      await user.click(screen.getByRole('button', { name: 'Stop' }));
      expect(screen.getByTestId('length-note')).toHaveTextContent(/good length/);
      await user.click(screen.getByRole('button', { name: i === 5 ? 'Finish' : 'Next question' }));
    }
    expect(screen.getByTestId('summary-line')).toHaveTextContent('You gave 5 answers in 1:40');

    expect(screen.getByTestId('speaking-estimate')).toHaveTextContent('Rate all four');
    for (const [name, level] of [['Fluency and Coherence', '7'], ['Lexical Resource', '7'], ['Grammatical Range and Accuracy', '6'], ['Pronunciation', '6']]) {
      await user.selectOptions(screen.getByLabelText(name), level);
    }
    expect(screen.getByTestId('speaking-estimate')).toHaveTextContent('6.5');
    await user.click(screen.getByRole('button', { name: 'Save this session' }));
    await user.click(screen.getByRole('button', { name: 'Practise again' }));
    expect(screen.getByText('Past sessions')).toBeInTheDocument();
    expect(screen.getByText(/5 answers, 1:40/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Delete session/ }));
    expect(screen.queryByText('Past sessions')).not.toBeInTheDocument();
  });

  it('flags a very short answer and lets the learner retry it', async () => {
    setup();
    await user.click(screen.getByLabelText('Part 1: personal questions'));
    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    await user.click(screen.getByRole('button', { name: 'Start my answer' }));
    tick(3000);
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByTestId('length-note')).toHaveTextContent(/Shorter than/);
    await user.click(screen.getByRole('button', { name: 'Try this question again' }));
    expect(screen.getByTestId('progress')).toHaveTextContent('Question 1 of 5');
    expect(screen.getByRole('button', { name: 'Start my answer' })).toBeInTheDocument();
  });
});

describe('SpeakingStudio part 2 flow', () => {
  it('counts down 60 seconds of preparation, moves on by itself, and stops the answer at 2 minutes', async () => {
    setup();
    await user.click(screen.getByLabelText('Part 2: long turn (cue card)'));
    await user.selectOptions(screen.getByLabelText('Cue card'), 'teacher');
    await user.click(screen.getByRole('button', { name: 'Start practice' }));

    expect(screen.getByTestId('prompt')).toHaveTextContent('Describe a teacher who has influenced you.');
    expect(screen.getByText('You should say:')).toBeInTheDocument();
    expect(screen.getByTestId('prep-clock')).toHaveTextContent('1:00');
    await user.type(screen.getByLabelText(/Make brief notes/), 'maths, kind, patient');
    tick(30_000);
    expect(screen.getByTestId('prep-clock')).toHaveTextContent('0:30');
    tick(30_000);
    // preparation ended on its own
    expect(screen.getByRole('button', { name: 'Start my answer' })).toBeInTheDocument();
    expect(screen.getByText('maths, kind, patient')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start my answer' }));
    tick(121_000);
    // auto-stopped exactly once at the limit
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
    expect(screen.getByTestId('length-note')).toHaveTextContent(/good length/);
    expect(screen.getAllByRole('button', { name: 'Try this question again' })).toHaveLength(1);
  });
});
