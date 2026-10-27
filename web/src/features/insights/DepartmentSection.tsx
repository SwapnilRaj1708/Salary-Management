import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { BarChart } from '@mui/x-charts/BarChart';
import { useInsightsByDepartment } from '../../api/queries.ts';
import { formatUsd } from '../../app/formatUsd.ts';
import { count, NoActiveEmployees, Section, SectionSkeleton } from './parts.tsx';

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/** Which department costs the most: a horizontal bar chart beside the exact figures. */
export function DepartmentSection({ asOf }: { asOf: string }) {
  const query = useInsightsByDepartment();
  const items = query.data?.items ?? [];

  return (
    <Section
      title="Payroll by department"
      subtitle={`Annual base pay run-rate in USD at fixed rates as of ${asOf}; no bonuses or employer costs.`}
    >
      {query.isPending ? (
        <SectionSkeleton height={320} />
      ) : query.isError ? (
        <Alert severity="error">These figures could not be loaded. Please try again.</Alert>
      ) : items.length === 0 ? (
        <NoActiveEmployees />
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <BarChart
              layout="horizontal"
              height={Math.max(220, items.length * 36 + 60)}
              dataset={items}
              yAxis={[{ scaleType: 'band', dataKey: 'department', width: 130 }]}
              xAxis={[
                {
                  valueFormatter: (value: number) => formatUsd(value, { compact: true }),
                  // Few ticks, so compact labels such as "$240M" never collide.
                  tickNumber: 4,
                },
              ]}
              series={[
                {
                  dataKey: 'payrollUsd',
                  label: 'Payroll (USD)',
                  valueFormatter: (value) => (value === null ? '' : formatUsd(value)),
                },
              ]}
              hideLegend
              margin={{ left: 0, right: 32 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Payroll by department">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell align="right">Headcount</TableCell>
                    <TableCell align="right">Payroll (USD)</TableCell>
                    <TableCell align="right">Share</TableCell>
                    <TableCell align="right">Average (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.departmentId}>
                      <TableCell component="th" scope="row">
                        {row.department}
                      </TableCell>
                      <TableCell align="right">{count(row.headcount)}</TableCell>
                      <TableCell align="right">{formatUsd(row.payrollUsd)}</TableCell>
                      <TableCell align="right">{percent(row.share)}</TableCell>
                      <TableCell align="right">{formatUsd(row.avgUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Grid>
        </Grid>
      )}
    </Section>
  );
}
