import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { COUNTRIES, type CountryInsight, formatMoney } from '@salary/shared';
import { useInsightsByCountry } from '../../api/queries.ts';
import { formatUsd } from '../../app/formatUsd.ts';
import { useSortedRows } from '../../components/useSortedRows.ts';
import { count, NoActiveEmployees, Section, SectionSkeleton, SortHeader } from './parts.tsx';

const SORT_KEYS = {
  country: (row: CountryInsight) => COUNTRIES[row.country].name,
  headcount: (row: CountryInsight) => row.headcount,
  avgUsd: (row: CountryInsight) => row.avgUsd,
  payrollUsd: (row: CountryInsight) => row.payrollUsd,
};

/** Min, median, average and max per country in its own currency, plus USD figures. */
export function CountrySection({ asOf }: { asOf: string }) {
  const query = useInsightsByCountry();
  const { rows, sort, sortBy } = useSortedRows(query.data?.items ?? [], SORT_KEYS, {
    key: 'payrollUsd',
    direction: 'desc',
  });

  return (
    <Section
      title="Pay by country"
      subtitle={`Local currency; USD at fixed rates as of ${asOf}. Median is the middle salary: half earn less.`}
    >
      {query.isPending ? (
        <SectionSkeleton />
      ) : query.isError ? (
        <Alert severity="error">These figures could not be loaded. Please try again.</Alert>
      ) : rows.length === 0 ? (
        <NoActiveEmployees />
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Pay by country">
            <TableHead>
              <TableRow>
                <SortHeader label="Country" column="country" sort={sort} onSort={sortBy} />
                <SortHeader
                  label="Headcount"
                  column="headcount"
                  sort={sort}
                  onSort={sortBy}
                  align="right"
                />
                <TableCell align="right">Min</TableCell>
                <TableCell align="right">Median</TableCell>
                <TableCell align="right">Average</TableCell>
                <TableCell align="right">Max</TableCell>
                <SortHeader
                  label="Average (USD)"
                  column="avgUsd"
                  sort={sort}
                  onSort={sortBy}
                  align="right"
                />
                <SortHeader
                  label="Payroll (USD)"
                  column="payrollUsd"
                  sort={sort}
                  onSort={sortBy}
                  align="right"
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.country}>
                  <TableCell component="th" scope="row">
                    {COUNTRIES[row.country].name}
                  </TableCell>
                  <TableCell align="right">{count(row.headcount)}</TableCell>
                  <TableCell align="right">{formatMoney(row.min)}</TableCell>
                  <TableCell align="right">{formatMoney(row.median)}</TableCell>
                  <TableCell align="right">{formatMoney(row.avg)}</TableCell>
                  <TableCell align="right">{formatMoney(row.max)}</TableCell>
                  <TableCell align="right">{formatUsd(row.avgUsd)}</TableCell>
                  <TableCell align="right">{formatUsd(row.payrollUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Section>
  );
}
