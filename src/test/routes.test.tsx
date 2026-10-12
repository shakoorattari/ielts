import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from './axe';
import { App } from '../App';

// App owns its HashRouter, so drive it through the URL hash like a real visit.
function visit(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

// [route, pattern the page's h1 must match (null = any h1)]
const ROUTES: [string, RegExp | null][] = [
  ['#/', /Welcome back/],
  ['#/browse', null],
  ['#/flashcards', null],
  ['#/fill-blank', null],
  ['#/quiz', null],
  ['#/writing', /Writing Practice/],
  ['#/history', /Attempts History/],
  ['#/settings', null],
  ['#/essays', null],
  ['#/phrases', null],
  ['#/synonyms', null],
  ['#/synonyms/flashcards', null],
  ['#/synonyms/quiz', null],
  ['#/synonyms/type', null],
  ['#/synonyms/rewrite', null],
  ['#/synonyms/scanner', null],
  ['#/synonyms/timed', null],
  ['#/synonyms/cheatsheet', null],
  ['#/writing-lab', /Writing lab/],
  ['#/speaking', /Speaking studio/],
  ['#/plan', /Study planner/],
  ['#/tools', /Score tools/],
];

describe('every route renders without crashing', () => {
  it.each(ROUTES)('%s', async (hash, heading) => {
    const { container } = visit(hash);
    // The whole tree sits under Suspense, so the main landmark appears once any lazy page has loaded.
    const main = await screen.findByRole('main', {}, { timeout: 4000 });
    const h1 = await within(main).findByRole('heading', { level: 1 }, { timeout: 4000 });
    if (heading) expect(h1).toHaveTextContent(heading);
    expect(container.textContent).not.toMatch(/something went wrong|\bundefined\b/i);
    expect(container.textContent).not.toMatch(/\bNaN\b/);
  });
});

describe('navigation and accessibility', () => {
  it('lists the new skill tools in the menu', async () => {
    visit('#/');
    await screen.findByText(/Welcome back/);
    for (const name of ['Skills', 'Plan']) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
  });

  it('the dashboard has no detectable accessibility violations', async () => {
    const { container } = visit('#/');
    await screen.findByText(/Welcome back/);
    expect(await axe(container)).toHaveNoViolations();
  });
});
