import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type EmployeeDetail, UpdateEmployeeRequest } from '@salary/shared';
import { type FormEvent, useState } from 'react';
import { useUpdateEmployee } from '../../api/queries.ts';
import { DepartmentSelect, JobTitleSelect } from './EmployeeFields.tsx';
import { describeSaveError, type FieldErrors, toFieldErrors } from './formErrors.ts';

/** Edits name, email, department and job title. Mounted only while open. */
export function EditEmployeeDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Omit<EmployeeDetail, 'fx'>;
  onClose: () => void;
  onSaved: (updated: EmployeeDetail) => void;
}) {
  const update = useUpdateEmployee(employee.id);
  const [fullName, setFullName] = useState(employee.fullName);
  const [email, setEmail] = useState(employee.email);
  const [departmentId, setDepartmentId] = useState<number | null>(employee.departmentId);
  const [jobTitleId, setJobTitleId] = useState<number | null>(employee.jobTitleId);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Only what changed is sent.
    const changes = Object.fromEntries(
      Object.entries({
        fullName: fullName.trim() === employee.fullName ? undefined : fullName,
        email: email.trim().toLowerCase() === employee.email ? undefined : email,
        departmentId: departmentId === employee.departmentId ? undefined : departmentId,
        jobTitleId: jobTitleId === employee.jobTitleId ? undefined : jobTitleId,
      }).filter(([, value]) => value !== undefined),
    );
    if (departmentId === null || jobTitleId === null) {
      setErrors({
        ...(departmentId === null ? { departmentId: 'Choose a department' } : {}),
        ...(jobTitleId === null ? { jobTitleId: 'Choose a job title' } : {}),
      });
      return;
    }
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    const parsed = UpdateEmployeeRequest.safeParse(changes);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setMessage(undefined);
    update.mutate(parsed.data, {
      onSuccess: onSaved,
      onError: (error) => {
        const described = describeSaveError(error, {
          EMAIL_TAKEN: ['email', 'Another employee already has this email'],
        });
        setErrors(described.fields);
        setMessage(described.message);
      },
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Edit details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {message && <Alert severity="error">{message}</Alert>}
            <TextField
              label="Full name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={Boolean(errors.fullName)}
              helperText={errors.fullName}
            />
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email}
            />
            <DepartmentSelect
              value={departmentId}
              onChange={setDepartmentId}
              error={errors.departmentId}
            />
            <JobTitleSelect value={jobTitleId} onChange={setJobTitleId} error={errors.jobTitleId} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
