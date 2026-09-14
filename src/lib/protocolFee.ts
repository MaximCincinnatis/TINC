import type { BurnData } from '@/types/BurnData';

/**
 * The protocol fee and the buy-and-burn's settings, in words (2026-09-14). Every figure comes from
 * the snapshot fields that scripts/protocol-facts.js reads from the contracts at each update; each
 * helper returns null when a snapshot predates the field, and the copy falls back to a sentence
 * without the figure.
 */
export type FeeData =
  | Pick<BurnData, 'protocolFeeMinPercent' | 'protocolFeeMaxPercent' | 'buyAndBurnSettings' | 'protocolFeeCollected'>
  | null
  | undefined;

const CEILING = 25; // FarmKeeper._validateProtocolFee: fee > 2500 basis points reverts

/** "25% on every farm today and the contract’s ceiling", or a range when the farms differ */
export function feePhrase(data: FeeData): string | null {
  const max = typeof data?.protocolFeeMaxPercent === 'number' ? data.protocolFeeMaxPercent : null;
  if (max === null) return null;
  const min = typeof data?.protocolFeeMinPercent === 'number' ? data.protocolFeeMinPercent : max;
  if (min !== max) return `between ${min}% and ${max}% by farm today (the contract’s ceiling is ${CEILING}%)`;
  return max === CEILING
    ? `${max}% on every farm today and the contract’s ceiling`
    : `${max}% on every farm today (the contract’s ceiling is ${CEILING}%)`;
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** 526B, 30.2B, 4.59M, 140K, 312, 23.8: three significant figures with a unit from a thousand up */
export function compactAmount(n: number): string {
  const a = Math.abs(n);
  const unit: [number, string] | null =
    a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : null;
  if (!unit) {
    if (a >= 100) return Math.round(n).toLocaleString('en-US');
    return n.toLocaleString('en-US', { maximumFractionDigits: a >= 10 ? 1 : 2 });
  }
  const v = n / unit[0];
  const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return `${s.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1')}${unit[1]}`;
}

const fraction = (pct: number) =>
  pct === 50 ? 'half' : pct === 25 ? 'a quarter' : pct === 20 ? 'a fifth' : pct === 10 ? 'a tenth' : `${pct}%`;

/** "a fifth burned as itself and the rest swapped for TINC, caller cut 2.5%" */
export function describeSetting(s: { burnedAsItselfPercent: number; callerCutPercent: number }): string {
  const b = s.burnedAsItselfPercent;
  const share =
    b === 100 ? 'burned directly' : b === 0 ? 'swapped for TINC in full' : `${fraction(b)} burned as itself and the rest swapped for TINC`;
  return `${share}, caller cut ${s.callerCutPercent}%`;
}

/** UTC calendar day the way the dated line prints it: "Jun 29, 2026" */
export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "526B TITANX, 30.2B HYDRA … and 23.8 ETH" */
export const listWithAnd = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] ?? '';
