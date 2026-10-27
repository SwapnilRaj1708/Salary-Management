import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { COUNTRIES, type CountryCode, formatMoney, type JobTitleInsight } from '@salary/shared';
import { useInsightsByJobTitle } from '../../api/queries.ts';
import { formatUsd } from '../../app/formatUsd.ts';
import { useSortedRows } from '../../components/useSortedRows.ts';
import { CountrySelect } from './CountrySelect.tsx';
import { count, NoActiveEmployees, Section, SectionSkeleton, SortHeader } from './parts.tsx';

const SORT_KEYS = {
  jobTitle: (row: JobTitleInsight) => row.jobTitle,
  headcount: (row: JobTitleInsight) => row.headcount,
  avgUsd: (row: JobTitleInsight) => row.avgUsd,
};

/**
 * Average pay per job title: across countries in USD, or within one country in its own
 * currency, which is the like-for-like comparison.
 */
export function JobTitleSection({
  asOf,
  country,
  onCountryChange,
}: {
  asOf: string;
  country: CountryCode | undefined;
  onCountryChange: (country: CountryCode | undefined) => void;
}) {
  const query = useInsightsByJobTitle(country);
  const { rows, sort, sortBy } = useSortedRows(query.data?.items ?? [], SORT_KEYS, {
    key: 'avgUsd',
    direction: 'desc',
  });
  const local = country !== undefined;

  return (
    <Section
      title="Average pay by job title"
      subtitle={
        local
          ? `${COUNTRIES[country].name} only, in ${COUNTRIES[country].currency}; USD at fixed rates as of ${asOf}.`
          : `Every country, in USD at fixed rates as of ${asOf}. This mixes labour markets; pick a country to compare like for like.`
      }
      action={
        <CountrySelect
          label="Country"
          value={country}
          onChange={onCountryChange}
          allLabel="All countries (USD)"
        />
      }
    >
      {query.isPending ? (
        <SectionSkeleton />
      ) : query.isError ? (
        <Alert severity="error">These figures could not be loaded. Please try again.</Alert>
      ) : rows.length === 0 ? (
        <NoActiveEmployees where={local ? COUNTRIES[country].name : undefined} />
      ) : (
        <Box sx={{ overflowX: 'auto', maxHeight: 480 }}>
          <Table size="small" stickyHeader aria-label="Average pay by job title">
            <TableHead>
              <TableRow>
                <SortHeader label="Job title" column="jobTitle" sort={sort} onSort={sortBy} />
                <SortHeader
                  label="Headcount"
                  column="headcount"
                  sort={sort}
                  onSort={sortBy}
                  align="right"
                />
                {local ? (
                  <>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Average</TableCell>
                    <TableCell align="right">Max</TableCell>
                  </>
                ) : (
                  <TableCell align="right">Countries</TableCell>
                )}
                <SortHeader
                  label="Average (USD)"
                  column="avgUsd"
                  sort={sort}
                  onSort={sortBy}
                  align="right"
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.jobTitleId}>
                  <TableCell component="th" scope="row">
                    {row.jobTitle}
                  </TableCell>
                  <TableCell align="right">{count(row.headcount)}</TableCell>
                  {row.local ? (
                    <>
                      <TableCell align="right">{formatMoney(row.local.min)}</TableCell>
                      <TableCell align="right">{formatMoney(row.local.avg)}</TableCell>
                      <TableCell align="right">{formatMoney(row.local.max)}</TableCell>
                    </>
                  ) : (
                    <TableCell align="right">{row.countries}</TableCell>
                  )}
                  <TableCell align="right">{formatUsd(row.avgUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Section>
  );
}
