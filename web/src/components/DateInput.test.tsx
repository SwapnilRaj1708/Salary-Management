import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../theme/theme.ts';
import { DateInput } from './DateInput.tsx';

function Harness({
  initial,
  onChange,
}: {
  initial: string | null;
  onChange: (v: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateInput
      label="Effective date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function renderInput(initial: string | null) {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={createAppTheme({ reducedMotion: 'always' })}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Harness initial={initial} onChange={onChange} />
      </LocalizationProvider>
    </ThemeProvider>,
  );
  return onChange;
}

describe('DateInput', () => {
  it('shows a YYYY-MM-DD value as it is', () => {
    renderInput('2025-03-01');

    expect(screen.getByRole('group', { name: 'Effective date' })).toHaveTextContent('2025-03-01');
  });

  it('hands back what is typed as a YYYY-MM-DD string', async () => {
    const user = userEvent.setup();
    const onChange = renderInput(null);

    await user.click(screen.getByRole('spinbutton', { name: 'Year' }));
    await user.keyboard('20250301');

    expect(onChange).toHaveBeenLastCalledWith('2025-03-01');
  });

  it('hands back null when part of a date is cleared', async () => {
    const user = userEvent.setup();
    const onChange = renderInput('2025-03-01');

    await user.click(screen.getByRole('spinbutton', { name: 'Day' }));
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
