import { COUNTRIES, COUNTRY_CODES, type CountryCode, CURRENCIES } from '@salary/shared';
import { DEPARTMENTS, type Department, type JobTitle } from '../db/reference.ts';
import { fromEpochDay, type IsoDate, toEpochDay } from '../domain/dates.ts';
import {
  COMPANY_FOUNDED,
  COUNTRY_PROFILES,
  DEPARTMENT_PROFILES,
  EMAIL_DOMAIN,
  HEADCOUNT,
  TITLE_PAY,
} from './catalogue.ts';
import type { Rng } from './prng.ts';

export type SeedReason = 'hire' | 'annual_review' | 'promotion' | 'market_adjustment';

export type SeedSalaryChange = { effectiveDate: IsoDate; amountMinor: number; reason: SeedReason };

export type SeedEmployee = {
  fullName: string;
  email: string;
  countryCode: CountryCode;
  department: Department;
  jobTitle: JobTitle;
  hireDate: IsoDate;
  /** The leaving date for a leaver; null while employed. */
  leftOn: IsoDate | null;
  /** The latest history amount, cached (decision D5). */
  salaryMinor: number;
  /** Oldest first; the first row is the hire. */
  history: SeedSalaryChange[];
};

export type GenerateOptions = { rng: Rng; count: number; asOf: IsoDate };

const LEAVER_SHARE = 0.08;
/** Pay drifts up about 3.5% a year, so earlier hires started lower. */
const YEARLY_DRIFT = 0.965;

/** Builds the seeded organisation. Pure: the same options give the same result. */
export function generateOrg({ rng, count, asOf }: GenerateOptions): SeedEmployee[] {
  const emails = new Map<string, number>();
  return shuffle(rng, countryQuotas(count)).map((countryCode) =>
    generateEmployee(rng, countryCode, asOf, emails),
  );
}

function generateEmployee(
  rng: Rng,
  countryCode: CountryCode,
  asOf: IsoDate,
  emails: Map<string, number>,
): SeedEmployee {
  const profile = COUNTRY_PROFILES[countryCode];
  const firstName = pick(rng, profile.firstNames);
  const lastName = pick(rng, profile.lastNames);
  const department = weighted(
    rng,
    DEPARTMENTS.map((d) => [d, DEPARTMENT_PROFILES[d].weight]),
  );
  const jobTitle = weighted(
    rng,
    Object.entries(DEPARTMENT_PROFILES[department].titles) as [JobTitle, number][],
  );

  // Hires lean towards recent years, as a growing company's do.
  const founded = toEpochDay(COMPANY_FOUNDED);
  const lastHireDay = toEpochDay(asOf) - 14;
  const hireDay = founded + Math.floor(rng() ** 0.6 * (lastHireDay - founded));
  const history = salaryHistory(rng, countryCode, jobTitle, hireDay, toEpochDay(asOf));

  const lastChangeDay = toEpochDay((history.at(-1) as SeedSalaryChange).effectiveDate);
  const leaves = rng() < LEAVER_SHARE && lastChangeDay < toEpochDay(asOf);
  const leftOn = leaves
    ? fromEpochDay(lastChangeDay + 1 + Math.floor(rng() * (toEpochDay(asOf) - lastChangeDay)))
    : null;

  return {
    fullName: `${firstName} ${lastName}`,
    email: uniqueEmail(emails, firstName, lastName),
    countryCode,
    department,
    jobTitle,
    hireDate: fromEpochDay(hireDay),
    leftOn,
    salaryMinor: (history.at(-1) as SeedSalaryChange).amountMinor,
    history,
  };
}

function salaryHistory(
  rng: Rng,
  countryCode: CountryCode,
  jobTitle: JobTitle,
  hireDay: number,
  asOfDay: number,
): SeedSalaryChange[] {
  const { salaryAnchor, roundTo } = COUNTRY_PROFILES[countryCode];
  const { minorUnit } = CURRENCIES[COUNTRIES[countryCode].currency];
  const step = roundTo * 10 ** minorUnit;
  const toMinor = (major: number) => Math.round(major / roundTo) * step;

  const yearsEmployed = (asOfDay - hireDay) / 365.25;
  const today = salaryAnchor * TITLE_PAY[jobTitle] * Math.exp(gaussian(rng) * 0.1);
  let amount = today * YEARLY_DRIFT ** yearsEmployed;
  const history: SeedSalaryChange[] = [
    { effectiveDate: fromEpochDay(hireDay), amountMinor: toMinor(amount), reason: 'hire' },
  ];

  for (let year = 1; ; year += 1) {
    const day = hireDay + 365 * year + Math.floor(rng() * 30);
    if (day > asOfDay) break;
    const roll = rng();
    const change: [SeedReason, number] | undefined =
      roll < 0.55
        ? ['annual_review', between(rng, 0.02, 0.05)]
        : roll < 0.67
          ? ['promotion', between(rng, 0.08, 0.15)]
          : roll < 0.72
            ? ['market_adjustment', between(rng, 0.03, 0.07)]
            : undefined;
    if (!change) continue;
    amount *= 1 + change[1];
    const previous = (history.at(-1) as SeedSalaryChange).amountMinor;
    history.push({
      effectiveDate: fromEpochDay(day),
      // A small raise can round back to the old amount; every change must differ.
      amountMinor: Math.max(toMinor(amount), previous + step),
      reason: change[0],
    });
  }
  return history;
}

/** Each country's share of `count`, in proportion to its headcount out of 10,000. */
function countryQuotas(count: number): CountryCode[] {
  const exact = COUNTRY_CODES.map((code) => ({
    code,
    share: (COUNTRY_PROFILES[code].headcount * count) / HEADCOUNT,
  }));
  const quotas = new Map(exact.map(({ code, share }) => [code, Math.floor(share)]));
  let missing = count - [...quotas.values()].reduce((a, b) => a + b, 0);
  // Hand out what rounding down left over, largest fraction first.
  for (const { code } of [...exact].sort((a, b) => (b.share % 1) - (a.share % 1))) {
    if (missing === 0) break;
    quotas.set(code, (quotas.get(code) ?? 0) + 1);
    missing -= 1;
  }
  return COUNTRY_CODES.flatMap((code) => Array<CountryCode>(quotas.get(code) ?? 0).fill(code));
}

function uniqueEmail(seen: Map<string, number>, firstName: string, lastName: string): string {
  const local = `${asciiLetters(firstName)}.${asciiLetters(lastName)}`;
  const n = (seen.get(local) ?? 0) + 1;
  seen.set(local, n);
  return `${local}${n === 1 ? '' : n}@${EMAIL_DOMAIN}`;
}

/** "Müller" → "muller", "Al-Sabah" → "alsabah", "Wei Ling" → "weiling". */
function asciiLetters(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function weighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [item, weight] of entries) {
    roll -= weight;
    if (roll < 0) return item;
  }
  return (entries.at(-1) as readonly [T, number])[0];
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

function between(rng: Rng, low: number, high: number): number {
  return low + rng() * (high - low);
}

/** A standard normal sample (Box–Muller). */
function gaussian(rng: Rng): number {
  const u = 1 - rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
