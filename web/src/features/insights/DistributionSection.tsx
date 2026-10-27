import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { COUNTRIES, type CountryCode, formatMoney, PERCENTILE_KEYS } from '@salary/shared';
import { useDistribution } from '../../api/queries.ts';
import { CountrySelect } from './CountrySelect.tsx';
import { count, NoActiveEmployees, Section, SectionSkeleton } from './parts.tsx';

const PERCENTILE_LABELS = { p10: 'P10', p25: 'P25', p50: 'Median', p75: 'P75', p90: 'P90' };

/** How spread out pay is in one country: a histogram and P10–P90, in local currency. */
export function DistributionSection({
  country,
  onCountryChange,
}: {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
}) {
  const query = useDistribution(country);
  const data = query.data;
  const currency = COUNTRIES[country].currency;
  const label = (amountMinor: number) => formatMoney({ amountMinor, currency }, { compact: true });

  return (
    <Section
      title="Pay distribution"
      subtitle={`One country at a time, in ${currency}. Each bar counts the salaries from its lower edge up to the next.`}
      action={
        <CountrySelect
          label="Country"
          value={country}
          onChange={(next) => next && onCountryChange(next)}
        />
      }
    >
      {query.isPending ? (
        <SectionSkeleton height={320} />
      ) : query.isError || !data ? (
        <Alert severity="error">These figures could not be loaded. Please try again.</Alert>
      ) : data.percentiles === null ? (
        <NoActiveEmployees where={COUNTRIES[country].name} />
      ) : (
        <Stack spacing={2}>
          <Grid container spacing={2} component="dl" aria-label="Percentiles" sx={{ m: 0 }}>
            {PERCENTILE_KEYS.map((key) => (
              <Grid key={key} size={{ xs: 6, sm: 'grow' }}>
                <Typography variant="caption" color="text.secondary" component="dt">
                  {PERCENTILE_LABELS[key]}
                </Typography>
                <Typography component="dd" sx={{ m: 0, fontWeight: 500 }}>
                  {formatMoney(data.percentiles?.[key] ?? { amountMinor: 0, currency })}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" color="text.secondary">
            {count(data.headcount)} active employees in {COUNTRIES[country].name}
          </Typography>
          <BarChart
            height={300}
            xAxis={[
              {
                scaleType: 'band',
                data: data.buckets.map((bucket) => label(bucket.fromMinor)),
                categoryGapRatio: 0,
                label: `Annual salary (${currency}), from`,
              },
            ]}
            yAxis={[{ label: 'Employees', width: 56 }]}
            series={[{ data: data.buckets.map((bucket) => bucket.count), label: 'Employees' }]}
            hideLegend
          />
        </Stack>
      )}
    </Section>
  );
}
