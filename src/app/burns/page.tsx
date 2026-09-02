import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/PageChrome';
import { loadHistory, monthKeys, summarizeMonth, dayLabel } from '@/lib/history';
import { fmtCompact, fmtInt } from '@/lib/format';
import { SITE } from '@/lib/share';

/** /burns: the months in the daily archive, newest first, each with its totals. 2026-09-02 SEO pass. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'TINC burn archive by month · TINCBurn.fyi',
  description:
    'Month by month: how much TINC was burned, how much was emitted, and how many days were deflationary. The daily archive of the Titan Farms Incentive Token burn, read from Ethereum.',
  alternates: { canonical: `${SITE}/burns` },
  openGraph: { type: 'website', url: `${SITE}/burns`, title: 'TINC burn archive by month', description: 'Monthly burned, emitted and deflationary-day totals for TINC.' },
};

export default async function BurnsIndexPage() {
  const h = await loadHistory();
  const today = h ? h.updatedAt.slice(0, 10) : '';
  const months = h ? monthKeys(h).map((ym) => summarizeMonth(h, ym, today)).filter((s): s is NonNullable<typeof s> => !!s) : [];
  const total = months.reduce((a, s) => a + s.burned, 0);
  const days = months.reduce((a, s) => a + s.covered, 0);

  return (
    <div className="App">
      <SiteHeader eyebrow="龍炎 Burn archive" />
      <main className="container">
        <section className="about-section doc" aria-labelledby="archive-title">
          <div className="about-header">
            <h2 className="main-title" id="archive-title">
              <span className="kanji-accent">記録</span> Burn archive
            </h2>
            <p className="subtitle">
              {h
                ? `${fmtInt(total)} TINC burned over ${days} recorded days since ${dayLabel(h.since)}, ${h.since.slice(0, 4)}`
                : 'The daily archive is not available right now.'}
            </p>
          </div>
          <div className="doc-body">
            {months.length > 0 ? (
              <ul className="month-list">
                {months.map((s) => (
                  <li key={s.ym}>
                    <Link href={`/burns/${s.ym}`}>
                      {s.label}
                      {s.current ? ' · to date' : ''}
                    </Link>
                    <span className="figs">
                      {fmtCompact(s.burned)} burned · {s.deflationaryDays}/{s.covered} deflationary
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No months recorded yet.</p>
            )}
            <p className="lookup-note">
              Each month compares burns with {h ? fmtInt(h.emissionPerDay) : '86,400'} TINC emitted per recorded day.
              The archive folds the tracker&rsquo;s rolling 30-day window into a daily record; it began on{' '}
              {h ? `${dayLabel(h.since)}, ${h.since.slice(0, 4)}` : '4 August 2026'}, so earlier months are not
              available. <Link href="/methodology">Methodology</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
