import Alert from '@mui/material/Alert';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { COUNTRIES, COUNTRY_CODES, type CountryCode, CreateEmployeeRequest } from '@salary/shared';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { useCreateEmployee } from '../../api/queries.ts';
import { ButtonLink } from '../../app/ButtonLink.tsx';
import { TextLink } from '../../app/TextLink.tsx';
import { useToast } from '../../app/Toasts.tsx';
import { localToday } from '../../app/today.ts';
import { DateInput } from '../../components/DateInput.tsx';
import { MoneyInput, readMoney } from '../../components/MoneyInput.tsx';
import { DepartmentSelect, JobTitleSelect } from './EmployeeFields.tsx';
import { describeSaveError, type FieldErrors, toFieldErrors } from './formErrors.ts';

const EARLIEST_HIRE_DATE = '1950-01-01';

const COUNTRIES_BY_NAME = [...COUNTRY_CODES].sort((a, b) =>
  COUNTRIES[a].name.localeCompare(COUNTRIES[b].name),
);

export function NewEmployeePage() {
  const create = useCreateEmployee();
  const navigate = useNavigate();
  const toast = useToast();
  const today = localToday();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode | ''>('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [jobTitleId, setJobTitleId] = useState<number | null>(null);
  const [hireDate, setHireDate] = useState<string | null>(today);
  const [salary, setSalary] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>();
  const currency = countryCode ? COUNTRIES[countryCode].currency : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const money = currency ? readMoney(salary, currency) : undefined;
    const parsed = CreateEmployeeRequest.safeParse({
      fullName,
      email,
      countryCode,
      departmentId,
      jobTitleId,
      hireDate,
      salaryMinor: money && 'amountMinor' in money ? money.amountMinor : 1,
    });
    const fieldErrors: FieldErrors = parsed.success ? {} : toFieldErrors(parsed.error.issues);
    // Plain wording for the fields zod would describe in type terms.
    if (!fullName.trim()) fieldErrors.fullName = 'Enter the full name';
    if (!countryCode) fieldErrors.countryCode = 'Choose a country';
    if (departmentId === null) fieldErrors.departmentId = 'Choose a department';
    if (jobTitleId === null) fieldErrors.jobTitleId = 'Choose a job title';
    if (!hireDate) fieldErrors.hireDate = 'Enter the hire date';
    if (money && 'error' in money) fieldErrors.salaryMinor = money.error;
    if (!money) fieldErrors.salaryMinor ??= 'Choose a country first';
    else if ('amountMinor' in money) delete fieldErrors.salaryMinor;
    if (!parsed.success || Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setMessage(undefined);
    create.mutate(parsed.data, {
      onSuccess: (employee) => {
        toast(`${employee.fullName} added`);
        void navigate({
          to: '/employees/$employeeId',
          params: { employeeId: employee.id },
          replace: true,
        });
      },
      onError: (error) => {
        const described = describeSaveError(error, {
          EMAIL_TAKEN: ['email', 'Another employee already has this email'],
          DATE_OUT_OF_RANGE: ['hireDate', `Choose a date from ${EARLIEST_HIRE_DATE} to today`],
        });
        setErrors(described.fields);
        setMessage(described.message);
      },
    });
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <Breadcrumbs aria-label="Breadcrumb">
        <TextLink to="/employees" underline="hover" color="inherit">
          Employees
        </TextLink>
        <Typography color="text.primary">Add employee</Typography>
      </Breadcrumbs>
      <Typography variant="h4" component="h1">
        Add employee
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <form onSubmit={submit} noValidate>
            <Stack spacing={2}>
              {message && <Alert severity="error">{message}</Alert>}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full name"
                    required
                    fullWidth
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    error={Boolean(errors.fullName)}
                    helperText={errors.fullName}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email"
                    type="email"
                    required
                    fullWidth
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Country"
                    required
                    fullWidth
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value as CountryCode)}
                    error={Boolean(errors.countryCode)}
                    helperText={
                      errors.countryCode ?? 'Sets the salary currency; it cannot change later'
                    }
                  >
                    {COUNTRIES_BY_NAME.map((code) => (
                      <MenuItem key={code} value={code}>
                        {COUNTRIES[code].name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DateInput
                    label="Hire date"
                    required
                    value={hireDate}
                    onChange={setHireDate}
                    minDate={EARLIEST_HIRE_DATE}
                    maxDate={today}
                    error={errors.hireDate}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DepartmentSelect
                    value={departmentId}
                    onChange={setDepartmentId}
                    error={errors.departmentId}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <JobTitleSelect
                    value={jobTitleId}
                    onChange={setJobTitleId}
                    error={errors.jobTitleId}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  {currency ? (
                    <MoneyInput
                      label="Starting annual salary"
                      currency={currency}
                      value={salary}
                      onChange={setSalary}
                      error={errors.salaryMinor}
                    />
                  ) : (
                    <TextField
                      label="Starting annual salary"
                      required
                      fullWidth
                      disabled
                      value=""
                      error={Boolean(errors.salaryMinor)}
                      helperText={errors.salaryMinor ?? 'Choose a country first'}
                    />
                  )}
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <ButtonLink to="/employees">Cancel</ButtonLink>
                <Button type="submit" variant="contained" loading={create.isPending}>
                  {create.isPending ? 'Saving…' : 'Add employee'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
