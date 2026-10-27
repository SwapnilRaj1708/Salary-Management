import type { SalaryReason } from '@salary/shared';

export const REASON_LABELS: Record<SalaryReason, string> = {
  hire: 'Hire',
  annual_review: 'Annual review',
  promotion: 'Promotion',
  market_adjustment: 'Market adjustment',
  correction: 'Correction',
  other: 'Other',
};

/** "+10.0%", "−5.0%" (a real minus sign), or an em dash for the hire row. */
export function formatChange(percent: number | null): string {
  if (percent === null) return '—';
  const text = `${Math.abs(percent).toFixed(1)}%`;
  return percent > 0 ? `+${text}` : percent < 0 ? `−${text}` : text;
}
