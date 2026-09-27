import type { Grade, ItemProgress, MasteryStatus } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MASTERED_INTERVAL_DAYS = 21;
const MASTERED_MIN_REPS = 4;

export function freshProgress(id: string): ItemProgress {
  return {
    id,
    status: 'new',
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: Date.now(),
    lastReviewed: null,
  };
}

function statusFor(p: ItemProgress): MasteryStatus {
  if (p.reps === 0) return 'new';
  if (p.interval >= MASTERED_INTERVAL_DAYS && p.reps >= MASTERED_MIN_REPS) return 'mastered';
  if (p.interval < 1) return 'learning';
  return 'review';
}

/**
 * SM-2 style update with a 4-button grade (again/hard/good/easy).
 * "again" resets the item back into the learning queue; the others grow
 * the interval by the ease factor, which itself shifts based on grade.
 */
export function review(prev: ItemProgress, grade: Grade, now = Date.now()): ItemProgress {
  let { ease, interval, reps, lapses } = prev;

  if (grade === 'again') {
    lapses += 1;
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    const next: ItemProgress = {
      ...prev,
      ease,
      interval,
      reps,
      lapses,
      due: now + 10 * 60 * 1000,
      lastReviewed: now,
      status: 'learning',
    };
    return next;
  }

  reps += 1;

  if (grade === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
    interval = interval < 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
  } else if (grade === 'good') {
    interval = interval < 1 ? 1 : reps === 1 ? 1 : Math.round(interval * ease);
  } else {
    ease = ease + 0.15;
    interval = interval < 1 ? 2 : Math.round(interval * ease * 1.3);
  }

  interval = Math.min(interval, 180);

  const next: ItemProgress = {
    ...prev,
    ease,
    interval,
    reps,
    lapses,
    due: now + interval * DAY_MS,
    lastReviewed: now,
    status: 'review',
  };
  next.status = statusFor(next);
  return next;
}

/** Simplified binary update used by quiz modes (right/wrong -> good/again). */
export function reviewFromResult(prev: ItemProgress, correct: boolean, now = Date.now()): ItemProgress {
  return review(prev, correct ? 'good' : 'again', now);
}

export function isDue(p: ItemProgress, now = Date.now()): boolean {
  return p.due <= now;
}
