import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from '../../test/axe';
import { describe, expect, it } from 'vitest';
import { ScoreTools } from '../ScoreTools';

const setup = (url = '/tools') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ScoreTools />
    </MemoryRouter>,
  );

describe('ScoreTools', () => {
  it('computes the overall band and updates as skills change', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByTestId('overall')).toHaveTextContent('6.5'); // (6.5+6.5+6+6.5)/4 = 6.375
    await user.selectOptions(screen.getByLabelText('Writing'), '7');
    expect(screen.getByTestId('overall')).toHaveTextContent('6.5'); // 6.625 rounds to the nearest half
    await user.selectOptions(screen.getByLabelText('Speaking'), '7');
    expect(screen.getByTestId('overall')).toHaveTextContent('7.0'); // 6.75 rounds up to the whole band
  });

  it('says what is needed in the remaining skill', async () => {
    const user = userEvent.setup();
    setup();
    await user.selectOptions(screen.getByLabelText('Skill still to come'), 'speaking');
    expect(screen.getByTestId('needed')).toHaveTextContent(/at least/);
    await user.selectOptions(screen.getByLabelText('Target overall'), '9');
    expect(screen.getByTestId('needed')).toHaveTextContent(/would not reach 9\.0/);
  });

  it('converts a valid mark and rejects an invalid one', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByLabelText(/Correct answers/);
    await user.clear(input);
    await user.type(input, '30');
    expect(screen.getByTestId('raw-result')).toHaveTextContent('band 7.0');
    await user.clear(input);
    await user.type(input, '41');
    expect(screen.getByTestId('raw-result')).toHaveTextContent('Enter a whole number');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});
