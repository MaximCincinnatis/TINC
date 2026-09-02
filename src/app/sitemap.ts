import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/share';

/**
 * /sitemap.xml (2026-09-02): replaces the hand-written public/sitemap.xml now that the site has a
 * second page. The lastmod values are still maintained BY HAND (the date of the last change to
 * each page's indexable copy), for the reason the old file gave: this repo auto-commits data every
 * 30 minutes and every push redeploys, so an automatic date would churn while the content stood
 * still, and Google discounts inaccurate lastmod. Bump the constant when the copy changes.
 */
const HOME_CONTENT_UPDATED = new Date('2026-09-02T00:00:00Z');
const METHODOLOGY_UPDATED = new Date('2026-09-02T00:00:00Z');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, lastModified: HOME_CONTENT_UPDATED },
    { url: `${SITE}/methodology`, lastModified: METHODOLOGY_UPDATED },
  ];
}
