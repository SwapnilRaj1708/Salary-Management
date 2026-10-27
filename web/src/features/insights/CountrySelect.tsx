import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from '@salary/shared';

const BY_NAME = [...COUNTRY_CODES].sort((a, b) =>
  COUNTRIES[a].name.localeCompare(COUNTRIES[b].name),
);

/** A country picker; `allLabel` adds a first option that means "every country". */
export function CountrySelect({
  label,
  value,
  onChange,
  allLabel,
}: {
  label: string;
  value: CountryCode | undefined;
  onChange: (country: CountryCode | undefined) => void;
  allLabel?: string;
}) {
  return (
    <TextField
      select
      label={label}
      value={value ?? ''}
      onChange={(event) => onChange((event.target.value || undefined) as CountryCode | undefined)}
      sx={{ minWidth: 200 }}
      // With an "every country" option, its empty value is a real choice and shows its label.
      slotProps={allLabel ? { select: { displayEmpty: true }, inputLabel: { shrink: true } } : {}}
    >
      {allLabel && <MenuItem value="">{allLabel}</MenuItem>}
      {BY_NAME.map((code) => (
        <MenuItem key={code} value={code}>
          {COUNTRIES[code].name}
        </MenuItem>
      ))}
    </TextField>
  );
}
