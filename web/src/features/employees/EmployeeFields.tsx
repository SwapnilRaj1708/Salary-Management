import Autocomplete from '@mui/material/Autocomplete';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useReferenceData } from '../../api/queries.ts';

/** Department and job title pickers shared by the new-employee form and the edit dialog. */
export function DepartmentSelect({
  value,
  onChange,
  error,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  error?: string | undefined;
}) {
  const reference = useReferenceData();
  return (
    <TextField
      select
      label="Department"
      required
      fullWidth
      value={reference.data ? (value ?? '') : ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      error={Boolean(error)}
      helperText={error}
    >
      {(reference.data?.departments ?? []).map((department) => (
        <MenuItem key={department.id} value={department.id}>
          {department.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function JobTitleSelect({
  value,
  onChange,
  error,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  error?: string | undefined;
}) {
  const reference = useReferenceData();
  const jobTitles = reference.data?.jobTitles ?? [];
  return (
    <Autocomplete
      options={jobTitles}
      getOptionLabel={(option) => option.name}
      value={jobTitles.find((title) => title.id === value) ?? null}
      onChange={(_event, title) => onChange(title?.id ?? null)}
      size="small"
      fullWidth
      renderInput={(params) => (
        <TextField
          {...params}
          label="Job title"
          required
          error={Boolean(error)}
          helperText={error}
        />
      )}
    />
  );
}
