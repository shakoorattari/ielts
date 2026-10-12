import { describe, expect, it } from 'vitest';
import { CUE_BY_ID, PART1_BY_ID } from '../../data/speaking';
import { buildSteps } from '../speakingSession';

describe('buildSteps', () => {
  it('part 1: five questions from the chosen topic, no prep', () => {
    const steps = buildSteps('part1', 'food', '');
    expect(steps).toHaveLength(5);
    for (const s of steps) {
      expect(s.part).toBe(1);
      expect(s.prepSec).toBe(0);
      expect(PART1_BY_ID.food.questions).toContain(s.prompt);
    }
    expect(new Set(steps.map((s) => s.prompt)).size).toBe(5);
  });

  it('part 2: one cue card with 60 seconds of prep and a 2 minute limit', () => {
    const [s] = buildSteps('part2', '', 'teacher');
    expect(s).toMatchObject({ part: 2, prepSec: 60, limitSec: 120, prompt: CUE_BY_ID.teacher.title });
    expect(s.card).toBe(CUE_BY_ID.teacher);
  });

  it('part 3: every follow-up question for the chosen card', () => {
    const steps = buildSteps('part3', '', 'journey');
    expect(steps.map((s) => s.prompt).sort()).toEqual([...CUE_BY_ID.journey.part3].sort());
  });

  it('mock: 4 + 1 + 4 in order, with part 3 linked to the same card', () => {
    const steps = buildSteps('mock', '', '');
    expect(steps.map((s) => s.part)).toEqual([1, 1, 1, 1, 2, 3, 3, 3, 3]);
    const card = steps[4].card!;
    for (const s of steps.slice(5)) expect(card.part3).toContain(s.prompt);
  });

  it('falls back to a random topic for an unknown id', () => {
    expect(buildSteps('part1', 'does-not-exist', '')).toHaveLength(5);
  });
});
