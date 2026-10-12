import { CUE_BY_ID, CUE_CARDS, PART1, PART1_BY_ID } from '../data/speaking';
import type { CueCard } from '../data/speaking';
import { shuffle } from './collocations';
import type { SpeakingMode } from './speakingState';
import type { Part } from './speakingStats';

export interface Step {
  part: Part;
  prompt: string;
  card?: CueCard;
  /** Seconds of preparation (Part 2 only). */
  prepSec: number;
  /** Seconds the answer should not exceed (Part 2 stops here, like an examiner). */
  limitSec: number | null;
}

export const PREP_SECONDS = 60;
export const PART2_LIMIT = 120;

const p1Step = (prompt: string): Step => ({ part: 1, prompt, prepSec: 0, limitSec: null });
const p3Step = (prompt: string): Step => ({ part: 3, prompt, prepSec: 0, limitSec: null });
const p2Step = (card: CueCard): Step => ({ part: 2, prompt: card.title, card, prepSec: PREP_SECONDS, limitSec: PART2_LIMIT });


/** Build the question queue for a session. An unknown or empty topic/card id picks one at random. */
export function buildSteps(mode: SpeakingMode, topicId: string, cardId: string): Step[] {
  const topic = PART1_BY_ID[topicId] ?? shuffle(PART1)[0];
  const card = CUE_BY_ID[cardId] ?? shuffle(CUE_CARDS)[0];
  const p1 = shuffle(topic.questions);
  const p3 = shuffle(card.part3);
  switch (mode) {
    case 'part1':
      return p1.slice(0, 5).map(p1Step);
    case 'part2':
      return [p2Step(card)];
    case 'part3':
      return p3.map(p3Step);
    case 'mock':
      return [...p1.slice(0, 4).map(p1Step), p2Step(card), ...p3.slice(0, 4).map(p3Step)];
  }
}
