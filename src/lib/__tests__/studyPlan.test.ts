import { describe, expect, it } from 'vitest';
import { TASKS, dateKey, daysBetween, parseKey, phaseFor, planDay, planWeek } from '../studyPlan';
import type { PlanSettings } from '../studyPlan';

const base: PlanSettings = { examDate: '', target: 7, hours: 2, focus: '' };
const monday = new Date(2026, 9, 12); // 12 Oct 2026 is a Monday

describe('dates', () => {
  it('formats and parses local dates, rejecting impossible ones', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(parseKey('2026-01-05')).toEqual(new Date(2026, 0, 5));
    expect(parseKey('2026-02-31')).toBeNull();
    expect(parseKey('tomorrow')).toBeNull();
    expect(parseKey('')).toBeNull();
  });

  it('counts calendar days across a daylight-saving change', () => {
    expect(daysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2); // clocks change in Europe on 29 March
    expect(daysBetween(new Date(2026, 9, 31), new Date(2026, 10, 2))).toBe(2);
    expect(daysBetween(new Date(2026, 5, 2), new Date(2026, 5, 1))).toBe(-1);
  });
});

describe('phases', () => {
  it.each([
    [null, 'open'], [-1, 'past'], [0, 'eve'], [1, 'eve'], [2, 'final'], [7, 'final'], [8, 'practise'], [28, 'practise'], [29, 'build'], [200, 'build'],
  ] as const)('%s days left -> %s', (days, phase) => expect(phaseFor(days)).toBe(phase));
});

describe('planDay', () => {
  it('is deterministic', () => {
    expect(planDay(monday, base)).toEqual(planDay(monday, base));
  });

  it('never exceeds the time available, except to plan at least one task', () => {
    for (const hours of [0.5, 1, 2, 3, 4]) {
      for (const p of planWeek(monday, { ...base, hours })) {
        expect(p.tasks.length).toBeGreaterThanOrEqual(1);
        if (p.tasks.length > 1) expect(p.minutes).toBeLessThanOrEqual(hours * 60);
        expect(p.minutes).toBe(p.tasks.reduce((n, t) => n + t.minutes, 0));
      }
    }
  });

  it('plans Saturday as the long full-test day when time allows', () => {
    const sat = planDay(new Date(2026, 9, 17), { ...base, hours: 4 });
    expect(sat.tasks[0].id).toBe('full-test');
  });

  it('puts the chosen weak skill first on a normal day', () => {
    expect(planDay(monday, { ...base, focus: 'listening' }).tasks[0].id).toBe('listening-set');
    expect(planDay(monday, { ...base, focus: 'speaking' }).tasks[0].id).toBe('speak-p2');
    expect(planDay(monday, base).tasks[0].id).toBe('vocab-due');
  });

  it('has no duplicate tasks in a day', () => {
    for (const focus of ['', 'listening', 'reading', 'writing', 'speaking', 'vocabulary'] as const) {
      for (const p of planWeek(monday, { ...base, hours: 8, focus })) {
        const ids = p.tasks.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('winds down towards the exam: light final week, rest on the eve, nothing after', () => {
    const exam = '2026-11-20';
    const s = { ...base, examDate: exam, hours: 4, focus: 'writing' as const };
    const finalWeek = planDay(new Date(2026, 10, 15), s);
    expect(finalWeek.phase).toBe('final');
    expect(finalWeek.tasks.map((t) => t.id)).not.toContain('full-test');
    expect(finalWeek.tasks.map((t) => t.id)).not.toContain('writing-t2'); // focus does not override a light week
    const eve = planDay(new Date(2026, 10, 19), s);
    expect(eve.tasks.map((t) => t.id)).toEqual(['rest-prep']);
    expect(planDay(new Date(2026, 10, 21), s).tasks).toEqual([]);
    expect(planDay(new Date(2026, 10, 21), s).phase).toBe('past');
  });

  it('reports days left', () => {
    expect(planDay(monday, { ...base, examDate: '2026-10-22' }).daysLeft).toBe(10);
    expect(planDay(monday, base).daysLeft).toBeNull();
    expect(planDay(monday, { ...base, examDate: 'junk' }).daysLeft).toBeNull();
  });

  it('every task points at a real in-app route or none', () => {
    for (const t of Object.values(TASKS)) {
      expect(t.minutes).toBeGreaterThan(0);
      if (t.to) expect(t.to.startsWith('/')).toBe(true);
    }
  });
});
