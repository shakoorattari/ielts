import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from '../../test/axe';
import { beforeEach, describe, expect, it } from 'vitest';
import { WritingLab } from '../WritingLab';
import { reloadLabState } from '../../lib/labState';

const setup = () =>
  render(
    <MemoryRouter>
      <WritingLab />
    </MemoryRouter>,
  );

beforeEach(() => reloadLabState());

describe('WritingLab', () => {
  it('serves a question and lets the learner ask for another', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Give me a question' }));
    const first = screen.getByTestId('question').textContent;
    expect(first?.length).toBeGreaterThan(30);
    await user.click(screen.getByRole('button', { name: 'Another question' }));
    expect(screen.getByTestId('question').textContent).not.toBe(first);
  });

  it('counts words live, flags a short draft and persists it', async () => {
    const user = userEvent.setup();
    const { unmount } = setup();
    await user.type(screen.getByLabelText('Write your essay here'), 'Governments should ban plastic bags. Kids waste a lot of things.');
    expect(screen.getByTestId('word-count')).toHaveTextContent('11 / 250 words');
    const notes = await screen.findByTestId('notes');
    expect(within(notes).getByText(/at least 250/)).toBeInTheDocument();
    expect(screen.getByText('Informal or vague wording')).toBeInTheDocument();
    unmount();
    reloadLabState();
    setup();
    expect(screen.getByLabelText('Write your essay here')).toHaveValue('Governments should ban plastic bags. Kids waste a lot of things.');
  });

  it('computes a self-assessed band only after all four criteria are rated', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByTestId('estimate')).toHaveTextContent('Rate all four criteria');
    for (const [name, level] of [['Task Response', '7'], ['Coherence and Cohesion', '7'], ['Lexical Resource', '6'], ['Grammatical Range and Accuracy', '6']]) {
      await user.selectOptions(screen.getByLabelText(name), level);
    }
    expect(screen.getByTestId('estimate')).toHaveTextContent('6.5'); // 6.5 mean
  });

  it('saves and deletes an attempt', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole('button', { name: /Save this attempt/ })).toBeDisabled();
    await user.type(screen.getByLabelText('Write your essay here'), 'Some words here.');
    await user.click(screen.getByRole('button', { name: /Save this attempt/ }));
    expect(await screen.findByText('3 words')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Delete attempt/ }));
    expect(screen.queryByText('3 words')).not.toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});
