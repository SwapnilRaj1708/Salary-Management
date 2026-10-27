import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

export const DATE_FORMAT = 'YYYY-MM-DD';

type DateInputProps = {
  label: string;
  /** A `YYYY-MM-DD` date, or null when empty. */
  value: string | null;
  /** Called with a `YYYY-MM-DD` date, or null while the field is empty or incomplete. */
  onChange: (value: string | null) => void;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  required?: boolean;
  error?: string | undefined;
  helperText?: string | undefined;
};

const toDayjs = (value: string | null | undefined) => (value ? dayjs(value, DATE_FORMAT) : null);

/**
 * The only date input in the app (CLAUDE.md, Web): the X DatePicker, with plain
 * `YYYY-MM-DD` strings in and out, so no Date or Dayjs object leaves this file.
 */
export function DateInput({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  required,
  error,
  helperText,
}: DateInputProps) {
  const min = toDayjs(minDate);
  const max = toDayjs(maxDate);
  return (
    <DatePicker
      label={label}
      format={DATE_FORMAT}
      value={toDayjs(value)}
      onChange={(next: Dayjs | null) => onChange(next?.isValid() ? next.format(DATE_FORMAT) : null)}
      {...(min ? { minDate: min } : {})}
      {...(max ? { maxDate: max } : {})}
      slotProps={{
        textField: {
          // The theme's small size for text fields doesn't reach the picker's own field.
          size: 'small',
          required: required ?? false,
          error: Boolean(error),
          helperText: error ?? helperText,
          fullWidth: true,
        },
      }}
    />
  );
}
