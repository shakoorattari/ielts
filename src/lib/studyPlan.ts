/**
 * Turns an exam date, a target and the hours a learner has per day into a checklist for each day.
 * Pure and deterministic: the same inputs always give the same plan, so it can be tested and printed.
 */
import type { Skill } from './bands';

export type Focus = Skill | 'vocabulary' | '';

export interface PlanTask {
  id: string;
  label: string;
  minutes: number;
  /** In-app route, or null for work done with a book or an official practice test. */
  to: string | null;
  area: Skill | 'vocabulary' | 'review';
}

export const TASKS: Record<string, PlanTask> = {
  'vocab-due': { id: 'vocab-due', label: 'Review your due collocation flashcards', minutes: 15, to: '/flashcards', area: 'vocabulary' },
  'vocab-new': { id: 'vocab-new', label: 'Learn 10 new collocations from one topic', minutes: 20, to: '/browse', area: 'vocabulary' },
  'syn-cards': { id: 'syn-cards', label: 'Synonym upgrade flashcards', minutes: 15, to: '/synonyms/flashcards', area: 'vocabulary' },
  'syn-rewrite': { id: 'syn-rewrite', label: 'Rewrite a paragraph with stronger words', minutes: 20, to: '/synonyms/rewrite', area: 'writing' },
  'essay-read': { id: 'essay-read', label: 'Read a model essay and mark its structure', minutes: 20, to: '/essays', area: 'writing' },
  'writing-t2': { id: 'writing-t2', label: 'Write a timed Task 2 essay, then rate it', minutes: 55, to: '/writing-lab', area: 'writing' },
  'writing-t1': { id: 'writing-t1', label: 'Write a Task 1 report in 20 minutes from an official practice test', minutes: 30, to: null, area: 'writing' },
  'speak-p1': { id: 'speak-p1', label: 'Speaking Part 1: answer five questions aloud', minutes: 15, to: '/speaking', area: 'speaking' },
  'speak-p2': { id: 'speak-p2', label: 'Speaking Part 2: one cue card, then its Part 3 questions', minutes: 25, to: '/speaking', area: 'speaking' },
  'speak-mock': { id: 'speak-mock', label: 'Full Speaking mock test, recorded and rated', minutes: 25, to: '/speaking', area: 'speaking' },
  'reading-set': { id: 'reading-set', label: 'One timed Reading passage (20 minutes), then check every wrong answer', minutes: 40, to: null, area: 'reading' },
  'listening-set': { id: 'listening-set', label: 'One Listening section, then re-listen to the questions you missed', minutes: 35, to: null, area: 'listening' },
  'scores': { id: 'scores', label: 'Convert your practice marks to bands and note your weakest skill', minutes: 10, to: '/tools', area: 'review' },
  'full-test': { id: 'full-test', label: 'Sit a full Listening, Reading and Writing practice test in one go', minutes: 170, to: null, area: 'review' },
  'rest-prep': { id: 'rest-prep', label: 'Rest. Check your ID, test centre route and start time, and sleep early', minutes: 10, to: null, area: 'review' },
};

// Index 0 is Sunday (Date.getDay()). Tasks are taken in order until the day's time is used.
const WEEK: string[][] = [
  ['scores', 'vocab-due', 'essay-read'], // Sun: light review
  ['vocab-due', 'writing-t2', 'speak-p1', 'vocab-new'], // Mon
  ['vocab-due', 'reading-set', 'speak-p2', 'syn-cards'], // Tue
  ['vocab-due', 'listening-set', 'syn-rewrite', 'speak-p1'], // Wed
  ['vocab-due', 'writing-t1', 'reading-set', 'vocab-new'], // Thu
  ['vocab-due', 'speak-mock', 'listening-set', 'essay-read'], // Fri
  ['full-test', 'scores', 'vocab-due'], // Sat: the long one
];

export type Phase = 'build' | 'practise' | 'final' | 'eve' | 'past' | 'open';

export interface PlanSettings {
  /** YYYY-MM-DD, or '' when no date is set. */
  examDate: string;
  target: number;
  /** Study hours available per day. */
  hours: number;
  focus: Focus;
}

export interface DayPlan {
  date: string;
  daysLeft: number | null;
  phase: Phase;
  tasks: PlanTask[];
  minutes: number;
}

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dateKey(d) === key ? d : null; // rejects 2026-02-31
}

/** Whole calendar days from a to b (negative if b is earlier). Immune to daylight-saving shifts. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}

const FOCUS_TASK: Record<Exclude<Focus, ''>, string> = {
  listening: 'listening-set',
  reading: 'reading-set',
  writing: 'writing-t2',
  speaking: 'speak-p2',
  vocabulary: 'vocab-new',
};

export function phaseFor(daysLeft: number | null): Phase {
  if (daysLeft === null) return 'open';
  if (daysLeft < 0) return 'past';
  if (daysLeft <= 1) return 'eve'; // the exam day itself and the day before
  if (daysLeft <= 7) return 'final';
  if (daysLeft <= 28) return 'practise';
  return 'build';
}

export const PHASE_TEXT: Record<Phase, { title: string; detail: string }> = {
  build: { title: 'Build', detail: 'Plenty of time. Build vocabulary and habits, and find your weakest skill early.' },
  practise: { title: 'Practise', detail: 'Switch to timed practice. Mark your own work and fix repeated mistakes.' },
  final: { title: 'Final week', detail: 'Keep practice light and timed. Review your errors rather than learning new material.' },
  eve: { title: 'Exam eve', detail: 'No new material. Rest and prepare.' },
  past: { title: 'Exam date passed', detail: 'Set a new exam date to get a fresh plan.' },
  open: { title: 'No exam date yet', detail: 'This is a balanced week. Set a date for a plan that adapts as it gets closer.' },
};

export function planDay(day: Date, s: PlanSettings): DayPlan {
  const exam = s.examDate ? parseKey(s.examDate) : null;
  const daysLeft = exam ? daysBetween(day, exam) : null;
  const phase = phaseFor(daysLeft);
  const budget = Math.round(Math.max(0.5, Math.min(8, s.hours)) * 60);

  let ids: string[];
  if (phase === 'past') ids = [];
  else if (phase === 'eve') ids = ['rest-prep'];
  else if (phase === 'final') ids = ['vocab-due', 'speak-p1', 'essay-read', 'scores'];
  else ids = [...WEEK[day.getDay()]];

  // Put the learner's weakest area first (except on rest or light days).
  if (s.focus && (phase === 'build' || phase === 'practise' || phase === 'open')) {
    const f = FOCUS_TASK[s.focus];
    ids = [f, ...ids.filter((id) => id !== f)];
  }
  // In the practise phase, timed mocks replace new-material tasks.
  if (phase === 'practise') ids = ids.map((id) => (id === 'vocab-new' ? 'speak-p1' : id));
  ids = [...new Set(ids)];

  const tasks: PlanTask[] = [];
  let used = 0;
  for (const id of ids) {
    const t = TASKS[id];
    // Always plan at least one task; otherwise stop before going over the time available.
    if (tasks.length > 0 && used + t.minutes > budget) continue;
    tasks.push(t);
    used += t.minutes;
  }
  return { date: dateKey(day), daysLeft, phase, tasks, minutes: used };
}

export function planWeek(from: Date, s: PlanSettings): DayPlan[] {
  return Array.from({ length: 7 }, (_, i) => planDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i), s));
}
