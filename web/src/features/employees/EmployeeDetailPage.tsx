import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, keyframes } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { COUNTRIES, type EmployeeDetail, formatMoney } from '@salary/shared';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { ApiError } from '../../api/client.ts';
import { employeeQuery } from '../../api/queries.ts';
import { formatUsd } from '../../app/formatUsd.ts';
import { TextLink } from '../../app/TextLink.tsx';
import { useToast } from '../../app/Toasts.tsx';
import { highlightFadeMs } from '../../theme/theme.ts';
import { EditEmployeeDialog } from './EditEmployeeDialog.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { formatChange, REASON_LABELS } from './labels.ts';
import { SalaryChangeDialog } from './SalaryChangeDialog.tsx';

const route = getRouteApi('/signed-in/employees/$employeeId');

type OpenDialog = 'edit' | 'salary' | 'leave' | null;

export function EmployeeDetailPage() {
  const { employeeId } = route.useParams();
  const valid = Number.isSafeInteger(employeeId) && employeeId > 0;
  const query = useQuery({ ...employeeQuery(employeeId), enabled: valid });
  const toast = useToast();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [highlightId, setHighlightId] = useState<number>();

  const notFound = !valid || (query.error instanceof ApiError && query.error.code === 'NOT_FOUND');
  if (notFound) {
    return (
      <Stack spacing={2}>
        <Back />
        <Alert severity="warning">There is no employee with this id.</Alert>
      </Stack>
    );
  }
  if (query.isError) {
    return (
      <Stack spacing={2}>
        <Back />
        <Alert severity="error">This employee could not be loaded. Please try again.</Alert>
      </Stack>
    );
  }
  if (query.isPending) return <DetailSkeleton />;

  const employee = query.data;
  const close = () => setDialog(null);
  const saved = (message: string) => (updated: EmployeeDetail) => {
    close();
    toast(message);
    return updated;
  };

  return (
    <Stack spacing={3}>
      <Breadcrumbs aria-label="Breadcrumb">
        <TextLink to="/employees" underline="hover" color="inherit">
          Employees
        </TextLink>
        <Typography color="text.primary">{employee.fullName}</Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {employee.fullName}
            </Typography>
            {employee.status === 'left' ? (
              <Chip label={`Left ${employee.leftOn}`} />
            ) : (
              <Chip color="success" variant="outlined" label="Active" />
            )}
          </Stack>
          <Typography color="text.secondary">
            {employee.employeeCode} · {employee.jobTitle}, {employee.department}
          </Typography>
        </Stack>
        {employee.status === 'active' && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => setDialog('salary')}>
              Change salary
            </Button>
            <Button variant="outlined" onClick={() => setDialog('edit')}>
              Edit details
            </Button>
            <Button color="warning" onClick={() => setDialog('leave')}>
              Mark as left
            </Button>
          </Stack>
        )}
      </Stack>

      {employee.status === 'left' && (
        <Alert severity="info">
          {employee.fullName} left on {employee.leftOn}. Their record is read-only.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2}>
            <Field label="Current salary">
              <Typography variant="h6" component="span">
                {formatMoney(employee.salary)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatUsd(employee.salaryUsd)} at the {query.data.fx.asOf} rate
              </Typography>
            </Field>
            <Field label="Email">{employee.email}</Field>
            <Field label="Country">
              {COUNTRIES[employee.country].name} ({employee.salary.currency})
            </Field>
            <Field label="Department">{employee.department}</Field>
            <Field label="Job title">{employee.jobTitle}</Field>
            <Field label="Hired">{employee.hireDate}</Field>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Salary history
          </Typography>
          <SalaryHistoryTable employee={employee} highlightId={highlightId} />
        </CardContent>
      </Card>

      {dialog === 'salary' && (
        <SalaryChangeDialog
          employee={employee}
          onClose={close}
          onSaved={(updated) => {
            setHighlightId(updated.salaryHistory[0]?.id);
            saved('Salary change saved')(updated);
          }}
        />
      )}
      {dialog === 'edit' && (
        <EditEmployeeDialog employee={employee} onClose={close} onSaved={saved('Details saved')} />
      )}
      {dialog === 'leave' && (
        <LeaveDialog
          employee={employee}
          onClose={close}
          onSaved={saved(`${employee.fullName} is marked as left`)}
        />
      )}
    </Stack>
  );
}

function Back() {
  return (
    <TextLink to="/employees" underline="hover">
      ← Back to employees
    </TextLink>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Grid>
  );
}

const fadeOut = (from: string) => keyframes`
  from { background-color: ${from}; }
  to { background-color: transparent; }
`;

function SalaryHistoryTable({
  employee,
  highlightId,
}: {
  employee: Omit<EmployeeDetail, 'fx'>;
  highlightId: number | undefined;
}) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label="Salary history">
        <TableHead>
          <TableRow>
            <TableCell>Effective date</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Change</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Note</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employee.salaryHistory.map((row) => (
            <TableRow
              key={row.id}
              sx={
                row.id === highlightId
                  ? (theme) => ({
                      // Colour only, so it is the one fade outside the motion tokens (§4).
                      '@media (prefers-reduced-motion: no-preference)': {
                        animation: `${fadeOut(alpha(theme.palette.success.main, 0.16))} ${highlightFadeMs}ms ease-out`,
                      },
                    })
                  : undefined
              }
            >
              <TableCell>{row.effectiveDate}</TableCell>
              <TableCell align="right">{formatMoney(row.amount)}</TableCell>
              <TableCell align="right">{formatChange(row.changePercent)}</TableCell>
              <TableCell>{REASON_LABELS[row.reason]}</TableCell>
              <TableCell sx={{ color: 'text.secondary' }}>{row.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function DetailSkeleton() {
  return (
    <Stack spacing={3} aria-busy="true" aria-label="Loading employee">
      <Skeleton width={160} />
      <Skeleton variant="text" sx={{ fontSize: '2.125rem', width: 320 }} />
      <Skeleton variant="rounded" height={140} />
      <Skeleton variant="rounded" height={220} />
    </Stack>
  );
}
