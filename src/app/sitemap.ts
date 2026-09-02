import type { MetadataRoute } from 'next';
import { loadHistory, monthKeys, summarizeMonth } from '@/lib/history';
import { SITE } from '@/lib/share';

/**
 * /sitemap.xml (2026-09-02): replaces the hand-written public/sitemap.xml now that the site has
 * more than one page. The home and methodology lastmod values are still maintained BY HAND (the
 * date of the last change to their indexable copy), for the reason the old file gave: this repo
 * auto-commits data every 30 minutes and every push redeploys, so an automatic date would churn
 * while the content stood still, and Google discounts inaccurate lastmod. The archive pages take
 * their dates from the data itself, which is when they genuinely change.
 */
export const revalidate = 3600;

const HOME_CONTENT_UPDATED = new Date('2026-09-02T00:00:00Z');
const METHODOLOGY_UPDATED = new Date('2026-09-02T00:00:00Z');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: HOME_CONTENT_UPDATED },
    { url: `${SITE}/methodology`, lastModified: METHODOLOGY_UPDATED },
  ];
  const h = await loadHistory();
  if (!h) return entries;
  const updated = new Date(h.updatedAt);
  const today = h.updatedAt.slice(0, 10);
  entries.push({ url: `${SITE}/burns`, lastModified: updated });
  for (const ym of monthKeys(h)) {
    const s = summarizeMonth(h, ym, today);
    if (!s) continue;
    entries.push({ url: `${SITE}/burns/${ym}`, lastModified: s.current ? updated : new Date(`${s.lastDate}T23:59:59Z`) });
  }
  return entries;
}
