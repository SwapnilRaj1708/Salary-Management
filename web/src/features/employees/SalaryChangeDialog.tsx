import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import {
  type EmployeeDetail,
  formatMoney,
  SALARY_CHANGE_REASONS,
  type SalaryChangeReason,
  SalaryChangeRequest,
} from '@salary/shared';
import { type FormEvent, useState } from 'react';
import { useChangeSalary } from '../../api/queries.ts';
import { localToday } from '../../app/today.ts';
import { DateInput } from '../../components/DateInput.tsx';
import { MoneyInput, readMoney } from '../../components/MoneyInput.tsx';
import { describeSaveError, type FieldErrors, toFieldErrors } from './formErrors.ts';
import { REASON_LABELS } from './labels.ts';

/** Records a new salary. Mounted only while open, so every opening starts fresh. */
export function SalaryChangeDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Omit<EmployeeDetail, 'fx'>;
  onClose: () => void;
  onSaved: (updated: EmployeeDetail) => void;
}) {
  const change = useChangeSalary(employee.id);
  const currency = employee.salary.currency;
  const latest = employee.salaryHistory[0]?.effectiveDate ?? employee.hireDate;
  const today = localToday();
  const [amount, setAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(
    today < latest ? latest : today,
  );
  const [reason, setReason] = useState<SalaryChangeReason>('annual_review');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const money = readMoney(amount, currency);
    const parsed = SalaryChangeRequest.safeParse({
      amountMinor: 'amountMinor' in money ? money.amountMinor : 1,
      effectiveDate: effectiveDate ?? '',
      reason,
      note,
    });
    const fieldErrors: FieldErrors = parsed.success ? {} : toFieldErrors(parsed.error.issues);
    if ('error' in money) fieldErrors.amountMinor = money.error;
    if (!effectiveDate) fieldErrors.effectiveDate = 'Enter the date the new salary starts';
    if (!parsed.success || Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setMessage(undefined);
    change.mutate(parsed.data, {
      onSuccess: onSaved,
      onError: (error) => {
        const described = describeSaveError(error, {
          EFFECTIVE_DATE_BEFORE_LATEST_CHANGE: [
            'effectiveDate',
            `The date can't be before the latest change, on ${latest}`,
          ],
          DATE_OUT_OF_RANGE: ['effectiveDate', "The date can't be after today"],
          SALARY_UNCHANGED: ['amountMinor', 'This is the current salary; enter a different amount'],
        });
        setErrors(described.fields);
        setMessage(described.message);
      },
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Change salary</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {message && <Alert severity="error">{message}</Alert>}
            <MoneyInput
              label="New annual salary"
              currency={currency}
              value={amount}
              onChange={setAmount}
              error={errors.amountMinor}
              helperText={`Currently ${formatMoney(employee.salary)}`}
            />
            <DateInput
              label="Effective date"
              required
              value={effectiveDate}
              onChange={setEffectiveDate}
              minDate={latest}
              maxDate={today}
              error={errors.effectiveDate}
              helperText={`From ${latest} to today`}
            />
            <TextField
              select
              label="Reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value as SalaryChangeReason)}
            >
              {SALARY_CHANGE_REASONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {REASON_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Note"
              required={reason === 'other'}
              multiline
              minRows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              error={Boolean(errors.note)}
              helperText={errors.note ?? (reason === 'other' ? 'Say why' : 'Optional')}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={change.isPending}>
            {change.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
