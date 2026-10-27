import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FX_AS_OF } from '@salary/shared';
import { getRouteApi } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useInsightsByCountry } from '../../api/queries.ts';
import { formatUsd } from '../../app/formatUsd.ts';
import { CountrySection } from './CountrySection.tsx';
import { DepartmentSection } from './DepartmentSection.tsx';
import { DistributionSection } from './DistributionSection.tsx';
import { JobTitleSection } from './JobTitleSection.tsx';
import { count } from './parts.tsx';
import type { InsightsSearch } from './search.ts';

const route = getRouteApi('/signed-in/insights');

/** How ACME pays people: every figure covers active employees only. */
export function InsightsPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const byCountry = useInsightsByCountry();
  const asOf = byCountry.data?.fx.asOf ?? FX_AS_OF;
  // The choices sit far down the page; a navigation would otherwise scroll to the top.
  const setSearch = (changes: Partial<InsightsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...changes }), replace: true, resetScroll: false });

  const items = byCountry.data?.items ?? [];
  const headcount = items.reduce((sum, row) => sum + row.headcount, 0);
  const payroll = items.reduce((sum, row) => sum + row.payrollUsd, 0);

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h1">
          Insights
        </Typography>
        <Typography color="text.secondary">
          Active employees only. Figures spanning countries are in USD at fixed rates as of {asOf}.
        </Typography>
      </div>

      <Grid container spacing={2}>
        <Kpi label="Active employees" loading={byCountry.isPending}>
          {count(headcount)}
        </Kpi>
        <Kpi label="Annual base payroll (USD)" loading={byCountry.isPending}>
          {formatUsd(payroll)}
        </Kpi>
        <Kpi label="Countries" loading={byCountry.isPending}>
          {items.length}
        </Kpi>
      </Grid>

      <CountrySection asOf={asOf} />
      <DepartmentSection asOf={asOf} />
      <JobTitleSection
        asOf={asOf}
        country={search.titleCountry}
        onCountryChange={(titleCountry) => setSearch({ titleCountry })}
      />
      <DistributionSection
        country={search.distributionCountry}
        onCountryChange={(distributionCountry) => setSearch({ distributionCountry })}
      />
    </Stack>
  );
}

function Kpi({
  label,
  loading,
  children,
}: {
  label: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Card variant="outlined" role="group" aria-label={label}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {loading ? <Skeleton width="60%" /> : children}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
