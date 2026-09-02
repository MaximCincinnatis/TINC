/** Number formatting shared by the dashboard, the rank page and the Open Graph images. */

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US');

/** TINC balances: whole numbers above 1,000, up to three decimals below. */
export const fmtTinc = (n: number): string =>
  Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 3 });

/** Share of supply, e.g. 0.099% or 0.00042%. */
export const fmtPct = (p: number): string => `${p.toFixed(p >= 0.01 ? 3 : 5)}%`;

/** 907,170 -> 907K · 2,592,000 -> 2.59M · 1,684,830 -> 1.68M */
export const fmtCompact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return Math.round(n).toString();
};

export const fmtUtcClock = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.toISOString().slice(11, 16)} UTC`;
};

export const fmtUtcDate = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
};
