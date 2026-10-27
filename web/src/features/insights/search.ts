import { CountryCodeSchema } from '@salary/shared';
import { z } from 'zod';

/** The Insights page's choices, kept in the URL. A bad bookmark falls back to defaults. */
export const InsightsSearch = z.object({
  /** Job titles within one country, in its currency; absent means every country in USD. */
  titleCountry: CountryCodeSchema.optional().catch(undefined),
  /** The country whose pay distribution is shown. */
  distributionCountry: CountryCodeSchema.default('US').catch('US'),
});
export type InsightsSearch = z.infer<typeof InsightsSearch>;

export const INSIGHTS_DEFAULTS = { distributionCountry: 'US' } as const;
