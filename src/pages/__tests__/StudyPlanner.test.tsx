import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { reloadPlanState } from '../../lib/planState';
import { StudyPlanner } from '../StudyPlanner';

const setup = () =>
  render(
    <MemoryRouter>
      <StudyPlanner />
    </MemoryRouter>,
  );

beforeEach(() => {
  // Monday 12 October 2026, midday.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 12, 12) });
  localStorage.clear();
  reloadPlanState();
});
afterEach(() => vi.useRealTimers());

describe('StudyPlanner', () => {
  it('shows a balanced plan with no exam date', () => {
    setup();
    expect(screen.getByTestId('phase')).toHaveTextContent('No exam date yet');
    expect(screen.queryByTestId('days-left')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Review your due collocation flashcards/ })).toBeInTheDocument();
    expect(screen.getByText('The next seven days')).toBeInTheDocument();
  });

  it('counts down to the exam and changes phase with the time left', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Exam date'), '2026-10-22');
    expect(screen.getByTestId('days-left')).toHaveTextContent('10 days to go');
    expect(screen.getByTestId('phase')).toHaveTextContent('Practise');
    await user.clear(screen.getByLabelText('Exam date'));
    await user.type(screen.getByLabelText('Exam date'), '2026-10-13');
    expect(screen.getByTestId('phase')).toHaveTextContent('Exam eve');
    expect(screen.getByRole('checkbox', { name: /Rest\. Check your ID/ })).toBeInTheDocument();
  });

  it('ticks tasks off, tracks progress and remembers them after a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    const first = screen.getAllByRole('checkbox')[0];
    expect(screen.getByTestId('progress')).toHaveTextContent(/^0 of \d+ done/);
    await user.click(first);
    expect(first).toBeChecked();
    expect(screen.getByTestId('progress')).toHaveTextContent(/^1 of \d+ done/);
    unmount();
    reloadPlanState();
    setup();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
  });

  it('puts the chosen weak area first and links tasks to the right tools', async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText('Weakest area'), 'speaking');
    const list = screen.getAllByRole('listitem').find((li) => within(li).queryByRole('checkbox'))!;
    expect(list).toHaveTextContent(/Speaking Part 2/);
    expect(within(list).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/speaking');
  });

  it('carries the target band through to the score tools', async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText('Target overall band'), '7.5');
    expect(screen.getByRole('link', { name: 'Enter your practice scores' })).toHaveAttribute('href', '/tools?target=7.5');
  });

  it('plans more when given more time', async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText('Study time per day'), '0.5');
    const few = screen.getAllByRole('checkbox').length;
    await user.selectOptions(screen.getByLabelText('Study time per day'), '4');
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(few);
  });

  it('survives corrupt saved data', () => {
    localStorage.setItem('ielts-plan:v1', JSON.stringify({ examDate: '2026-99-99', target: 99, hours: -3, focus: 'swimming', done: { bad: ['x'], '2026-10-12': ['nonsense', 'vocab-due'] } }));
    reloadPlanState();
    setup();
    expect(screen.getByTestId('phase')).toHaveTextContent('No exam date yet');
    expect(screen.getByLabelText('Target overall band')).toHaveValue('7');
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked(); // vocab-due survived, the junk id did not
  });

  it('has no detectable accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});
