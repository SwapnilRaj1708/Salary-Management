import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { CURRENCIES, type CurrencyCode, type ParseMoneyError, parseMoney } from '@salary/shared';

const MESSAGES: Record<ParseMoneyError, string> = {
  EMPTY: 'Enter an amount',
  NOT_A_NUMBER: 'Enter a number, such as 85,000.00',
  NOT_POSITIVE: 'Enter an amount above zero',
  TOO_MANY_DECIMALS: 'Too many decimal places for this currency',
  TOO_LARGE: 'This amount is too large',
};

/**
 * Reads the typed text as an amount in minor units: the number, or an error message.
 * Parsing works on the string with the currency's decimals (CLAUDE.md, Money).
 */
export function readMoney(
  text: string,
  currency: CurrencyCode,
): { amountMinor: number } | { error: string } {
  const result = parseMoney(text, CURRENCIES[currency].minorUnit);
  return result.ok ? { amountMinor: result.amountMinor } : { error: MESSAGES[result.error] };
}

/** A money field: plain text with a decimal keypad, never `type="number"`. */
export function MoneyInput({
  label,
  currency,
  value,
  onChange,
  error,
  helperText,
}: {
  label: string;
  currency: CurrencyCode;
  value: string;
  onChange: (text: string) => void;
  error?: string | undefined;
  helperText?: string | undefined;
}) {
  return (
    <TextField
      label={label}
      required
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={Boolean(error)}
      helperText={error ?? helperText}
      slotProps={{
        htmlInput: { inputMode: 'decimal', autoComplete: 'off' },
        input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> },
      }}
    />
  );
}
