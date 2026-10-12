import { createLocalStore, isRecord, num, str, useLocalStore } from './localStore';
import { TASKS, parseKey } from './studyPlan';
import type { Focus, PlanSettings } from './studyPlan';

export interface PlanState extends PlanSettings {
  /** Task ids ticked off, by day (YYYY-MM-DD). */
  done: Record<string, string[]>;
}

const FOCI: Focus[] = ['', 'listening', 'reading', 'writing', 'speaking', 'vocabulary'];
const KEEP_DAYS = 120;

function normalize(v: unknown): PlanState {
  const p = isRecord(v) ? v : {};
  const examDate = parseKey(str(p.examDate)) ? str(p.examDate) : '';
  const target = num(p.target, 7);
  const hours = num(p.hours, 2);
  const focus = (FOCI as string[]).includes(str(p.focus)) ? (p.focus as Focus) : '';
  const done: Record<string, string[]> = {};
  if (isRecord(p.done)) {
    for (const [day, ids] of Object.entries(p.done)) {
      if (parseKey(day) && Array.isArray(ids)) done[day] = ids.filter((i): i is string => typeof i === 'string' && i in TASKS);
    }
  }
  return {
    examDate,
    target: target >= 4 && target <= 9 ? target : 7,
    hours: hours >= 0.5 && hours <= 8 ? hours : 2,
    focus,
    done,
  };
}

const store = createLocalStore<PlanState>('ielts-plan:v1', normalize);
export const reloadPlanState = () => store.reload();

export function usePlanState() {
  const state = useLocalStore(store);
  return {
    state,
    update: (patch: Partial<PlanSettings>) => store.set(patch),
    toggleDone: (day: string, taskId: string) => {
      const cur = store.get().done;
      const list = cur[day] ?? [];
      const next = list.includes(taskId) ? list.filter((i) => i !== taskId) : [...list, taskId];
      const done = { ...cur, [day]: next };
      // Keep the stored record small.
      const days = Object.keys(done).sort();
      for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete done[d];
      store.set({ done });
    },
    reset: () => store.set({ examDate: '', target: 7, hours: 2, focus: '', done: {} }),
  };
}
