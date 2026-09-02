import { promises as fs } from 'fs';
import path from 'path';

/**
 * The daily burn archive (2026-09-02). public/data/daily-history.json is folded from the rolling
 * 30-day window by scripts/accumulate-daily-history.js (cron, twice a day) and committed by the
 * updater with the rest of public/data. Fail-soft like the other readers: null when missing.
 * Traced into the burn-archive and sitemap functions via next.config.js outputFileTracingIncludes.
 */
export interface HistoryDay {
  date: string; // YYYY-MM-DD (UTC)
  amountTinc: number;
  transactionCount: number;
  /** false while the day is still filling (the snapshot's own day) */
  final: boolean;
}

export interface HistoryFile {
  since: string;
  updatedAt: string;
  emissionPerDay: number;
  days: HistoryDay[];
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function loadHistory(): Promise<HistoryFile | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'daily-history.json'), 'utf-8');
    const file = JSON.parse(raw) as HistoryFile;
    if (!file || !Array.isArray(file.days) || typeof file.emissionPerDay !== 'number') return null;
    return file;
  } catch {
    return null;
  }
}

/** Month keys (YYYY-MM) that have at least one day of data, newest first. */
export function monthKeys(h: HistoryFile): string[] {
  return Array.from(new Set(h.days.map((d) => d.date.slice(0, 7)))).sort().reverse();
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
}

export function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

export interface MonthSummary {
  ym: string;
  label: string;
  days: HistoryDay[];
  covered: number;
  span: number;
  firstDate: string;
  lastDate: string;
  burned: number;
  emitted: number;
  net: number;
  deflationaryDays: number;
  txs: number;
  /** every day of the month is in the file and the month is over */
  complete: boolean;
  /** the month the snapshot's day falls in */
  current: boolean;
}

/** Like the home page's window maths, per month: burns against days-with-data × the daily emission. */
export function summarizeMonth(h: HistoryFile, ym: string, todayKey: string): MonthSummary | null {
  const days = h.days.filter((d) => d.date.startsWith(ym)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (days.length === 0) return null;
  const span = daysInMonth(ym);
  const burned = days.reduce((s, d) => s + d.amountTinc, 0);
  const emitted = days.length * h.emissionPerDay;
  const current = todayKey.startsWith(ym);
  return {
    ym,
    label: monthLabel(ym),
    days,
    covered: days.length,
    span,
    firstDate: days[0].date,
    lastDate: days[days.length - 1].date,
    burned,
    emitted,
    net: emitted - burned,
    deflationaryDays: days.filter((d) => d.amountTinc > h.emissionPerDay).length,
    txs: days.reduce((s, d) => s + d.transactionCount, 0),
    complete: days.length === span && !current,
    current,
  };
}
