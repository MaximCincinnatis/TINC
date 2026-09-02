import type { RankResult } from './ranks';
import { fmtPct } from './format';

export const SITE = 'https://www.tincburn.fyi';

export function rankUrl(address: string): string {
  return `${SITE}/rank/${address}`;
}

/** One line for a Telegram or X post; the link preview (the rank card image) carries the rest. */
export function rankShareText(r: RankResult): string {
  const rank = `#${r.rank.toLocaleString('en-US')} of ${r.count.toLocaleString('en-US')} TINC holders`;
  return r.tier ? `${r.tier.name} on the TINC Dragon Ranks · ${rank} · ${fmtPct(r.pct)} of supply` : `TINC Dragon Rank · ${rank}`;
}

export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function xPostUrl(url: string, text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
