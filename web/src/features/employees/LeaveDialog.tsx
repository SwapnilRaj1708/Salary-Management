import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import type { EmployeeDetail } from '@salary/shared';
import { type FormEvent, useState } from 'react';
import { useMarkLeft } from '../../api/queries.ts';
import { localToday } from '../../app/today.ts';
import { DateInput } from '../../components/DateInput.tsx';
import { describeSaveError, type FieldErrors } from './formErrors.ts';

/** Marks the employee as left. Mounted only while open. */
export function LeaveDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Omit<EmployeeDetail, 'fx'>;
  onClose: () => void;
  onSaved: (updated: EmployeeDetail) => void;
}) {
  const markLeft = useMarkLeft(employee.id);
  const latestChange = employee.salaryHistory[0]?.effectiveDate ?? employee.hireDate;
  const earliest = latestChange > employee.hireDate ? latestChange : employee.hireDate;
  const today = localToday();
  const [leftOn, setLeftOn] = useState<string | null>(today < earliest ? earliest : today);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!leftOn) {
      setErrors({ leftOn: 'Enter the last day of employment' });
      return;
    }
    setErrors({});
    setMessage(undefined);
    markLeft.mutate(
      { leftOn },
      {
        onSuccess: onSaved,
        onError: (error) => {
          const described = describeSaveError(error, {
            DATE_OUT_OF_RANGE: ['leftOn', `Choose a date from ${earliest} to today`],
          });
          setErrors(described.fields);
          setMessage(described.message);
        },
      },
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Mark {employee.fullName} as left</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              They will leave the default directory and Insights, and their record becomes
              read-only. Their salary history is kept.
            </DialogContentText>
            {message && <Alert severity="error">{message}</Alert>}
            <DateInput
              label="Leaving date"
              required
              value={leftOn}
              onChange={setLeftOn}
              minDate={earliest}
              maxDate={today}
              error={errors.leftOn}
              helperText={`From ${earliest} to today`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="warning" loading={markLeft.isPending}>
            {markLeft.isPending ? 'Saving…' : 'Mark as left'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
