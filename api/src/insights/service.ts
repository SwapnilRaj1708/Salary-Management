import {
  type ByCountryResponse,
  type ByDepartmentResponse,
  type ByJobTitleResponse,
  COUNTRIES,
  type CountryCode,
  type CurrencyCode,
  type DistributionResponse,
  FX_AS_OF,
  type Money,
} from '@salary/shared';
import { histogram, percentile } from '../domain/stats.ts';
import type { InsightsRepository } from './repository.ts';

/** About this many bins in a distribution (docs/architecture.md §6). */
const DISTRIBUTION_BINS = 10;

// The response mapper: every derived float is rounded once, here (CLAUDE.md, Money).
const money = (amountMinor: number, currency: CurrencyCode): Money => ({
  amountMinor: Math.round(amountMinor),
  currency,
});
const cents = (usd: number) => Math.round(usd * 100) / 100;
const fx = { asOf: FX_AS_OF };

export function insightsService(repo: InsightsRepository) {
  return {
    async byCountry(): Promise<ByCountryResponse> {
      const { items, sortedSalaries } = await repo.byCountry();
      const rows = items.map((row) => ({
        country: row.country,
        currency: row.currency,
        headcount: row.headcount,
        min: money(row.minMinor, row.currency),
        median: money(percentile(sortedSalaries.get(row.country) ?? [], 0.5), row.currency),
        avg: money(row.avgMinor, row.currency),
        max: money(row.maxMinor, row.currency),
        avgUsd: cents(row.avgUsd),
        payrollUsd: cents(row.payrollUsd),
      }));
      rows.sort((a, b) => COUNTRIES[a.country].name.localeCompare(COUNTRIES[b.country].name));
      return { items: rows, fx };
    },

    async byJobTitle(country: CountryCode | undefined): Promise<ByJobTitleResponse> {
      const items = (await repo.byJobTitle(country)).map((row) => ({
        jobTitleId: row.jobTitleId,
        jobTitle: row.jobTitle,
        headcount: row.headcount,
        countries: row.countries,
        avgUsd: cents(row.avgUsd),
        // Local figures only within one country: across countries they mix currencies.
        ...(country
          ? {
              local: {
                min: money(row.minMinor, COUNTRIES[country].currency),
                avg: money(row.avgMinor, COUNTRIES[country].currency),
                max: money(row.maxMinor, COUNTRIES[country].currency),
              },
            }
          : {}),
      }));
      return { country: country ?? null, items, fx };
    },

    async byDepartment(): Promise<ByDepartmentResponse> {
      const rows = await repo.byDepartment();
      const total = rows.reduce((sum, row) => sum + row.payrollUsd, 0);
      return {
        items: rows.map((row) => ({
          departmentId: row.departmentId,
          department: row.department,
          headcount: row.headcount,
          payrollUsd: cents(row.payrollUsd),
          avgUsd: cents(row.avgUsd),
          share: total > 0 ? Math.round((row.payrollUsd / total) * 10_000) / 10_000 : 0,
        })),
        totalUsd: cents(total),
        fx,
      };
    },

    async distribution(country: CountryCode): Promise<DistributionResponse> {
      const currency = COUNTRIES[country].currency;
      const salaries = await repo.salaries(country);
      const at = (p: number) => money(percentile(salaries, p), currency);
      return {
        country,
        currency,
        headcount: salaries.length,
        percentiles:
          salaries.length === 0
            ? null
            : { p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) },
        buckets: histogram(salaries, DISTRIBUTION_BINS).map((bin) => ({
          fromMinor: bin.from,
          toMinor: bin.to,
          count: bin.count,
        })),
      };
    },
  };
}

export type InsightsService = ReturnType<typeof insightsService>;
