import type { AttemptRecord, ItemProgress, ProgressState } from '../types';

function mergeItemProgress(a: ItemProgress | undefined, b: ItemProgress | undefined): ItemProgress | undefined {
  if (!a) return b;
  if (!b) return a;
  const aTime = a.lastReviewed ?? -1;
  const bTime = b.lastReviewed ?? -1;
  if (aTime !== bTime) return aTime > bTime ? a : b;
  return a.reps >= b.reps ? a : b;
}

/**
 * Combines two progress snapshots (e.g. this device's local state and a
 * synced gist's state) without ever losing work done on either side:
 * per-item mastery keeps whichever side reviewed it more recently, streak
 * days and attempt history are unioned, and writing checks OR together
 * since checking something off is a one-way, monotonic signal.
 */
export function mergeProgressStates(local: ProgressState, remote: ProgressState): ProgressState {
  const items: ProgressState['items'] = {};
  for (const id of new Set([...Object.keys(local.items), ...Object.keys(remote.items)])) {
    const merged = mergeItemProgress(local.items[id], remote.items[id]);
    if (merged) items[id] = merged;
  }

  const history = Array.from(new Set([...local.history, ...remote.history])).sort();

  const writingChecks: ProgressState['writingChecks'] = { ...local.writingChecks };
  for (const [id, checked] of Object.entries(remote.writingChecks)) {
    writingChecks[id] = writingChecks[id] || checked;
  }

  const writingNotes: ProgressState['writingNotes'] = { ...remote.writingNotes, ...local.writingNotes };
  for (const [key, text] of Object.entries(writingNotes)) {
    if (!text) writingNotes[key] = remote.writingNotes[key] ?? local.writingNotes[key] ?? text;
  }

  const attemptsById = new Map<string, AttemptRecord>();
  for (const a of [...remote.attempts, ...local.attempts]) attemptsById.set(a.id, a);
  const attempts = Array.from(attemptsById.values())
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .slice(-300);

  return {
    items,
    history,
    writingNotes,
    writingChecks,
    totalReviews: Math.max(local.totalReviews, remote.totalReviews),
    attempts,
  };
}
