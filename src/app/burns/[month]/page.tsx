import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '@/components/PageChrome';
import { loadHistory, monthKeys, summarizeMonth, dayLabel, MONTH_RE, type MonthSummary } from '@/lib/history';
import { fmtCompact, fmtInt } from '@/lib/format';
import { SITE } from '@/lib/share';

/**
 * /burns/YYYY-MM: one month of the daily burn archive, with the same verdict maths as the home
 * page's window (burns against days-with-data × the daily emission). Honest about coverage: a
 * month that started mid-archive says so, and the current month says it is still filling.
 * Regenerated hourly; the data arrives with the updater's pushes. 2026-09-02 SEO pass.
 */
export const revalidate = 3600;

async function resolve(month: string) {
  if (!MONTH_RE.test(month)) return null;
  const h = await loadHistory();
  if (!h) return null;
  const today = h.updatedAt.slice(0, 10);
  const s = summarizeMonth(h, month, today);
  if (!s) return null;
  const keys = monthKeys(h).sort(); // oldest first
  const i = keys.indexOf(month);
  return { h, s, earlier: i > 0 ? keys[i - 1] : null, later: i >= 0 && i < keys.length - 1 ? keys[i + 1] : null };
}

function coverageLine(s: MonthSummary): string {
  if (s.complete) return `All ${s.span} days have data.`;
  if (s.current) return `Month to date: ${s.covered} of ${s.span} days so far; ${dayLabel(s.lastDate)} is still filling.`;
  return `${s.covered} of ${s.span} days have data (from ${dayLabel(s.firstDate)}); the archive began inside this month.`;
}

export async function generateMetadata({ params }: { params: { month: string } }): Promise<Metadata> {
  const r = await resolve(params.month);
  if (!r) return { title: 'Burn archive · TINCBurn.fyi', robots: { index: false } };
  const { s } = r;
  const title = `TINC burns in ${s.label}: ${fmtCompact(s.burned)} burned, ${s.deflationaryDays} deflationary ${s.deflationaryDays === 1 ? 'day' : 'days'} · TINCBurn.fyi`;
  const description = `${fmtInt(s.burned)} TINC burned in ${s.label} against ${fmtInt(s.emitted)} TINC emitted over ${s.covered} days of data; ${s.deflationaryDays} of ${s.covered} days beat the 86,400 TINC daily emission. Titan Farms Incentive Token burn archive, read from Ethereum.`;
  const url = `${SITE}/burns/${s.ym}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title, description, siteName: 'TINCBurn.fyi' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MonthPage({ params }: { params: { month: string } }) {
  const r = await resolve(params.month);
  if (!r) notFound();
  const { h, s, earlier, later } = r;
  const perDay = h.emissionPerDay;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `TINC daily burns, ${s.label}`,
    description: `Daily TINC burned and burn transaction counts for ${s.label} (${s.covered} of ${s.span} days), Titan Farms Incentive Token on Ethereum.`,
    url: `${SITE}/burns/${s.ym}`,
    temporalCoverage: `${s.firstDate}/${s.lastDate}`,
    creator: { '@id': `${SITE}/#org` },
    isPartOf: { '@id': `${SITE}/#dataset` },
    isAccessibleForFree: true,
    distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/data/daily-history.json` }],
  };

  return (
    <div className="App">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader eyebrow="龍炎 Burn archive" />
      <main className="container">
        <section className="chart-section doc month-section" aria-labelledby="month-title">
          <div className="chart-header">
            <h2 className="chart-title" id="month-title">
              TINC burns in {s.label}
            </h2>
            <p className="chart-subtitle">
              {s.covered} {s.covered === 1 ? 'day' : 'days'} of data · {s.deflationaryDays} of {s.covered} above the{' '}
              {fmtInt(perDay)} TINC/day emission
            </p>
            <div className="chart-verdict">
              <span className="verdict-fig">
                <b>{fmtCompact(s.burned)}</b>burned
              </span>
              <span className="verdict-fig">
                <b>{fmtCompact(s.emitted)}</b>emitted
              </span>
              <span className={`verdict-fig net ${s.net <= 0 ? 'down' : 'up'}`}>
                <b>
                  {s.net >= 0 ? '+' : '−'}
                  {fmtCompact(Math.abs(s.net))}
                </b>
                net supply
              </span>
            </div>
          </div>

          <table className="month-table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Burned (TINC)</th>
                <th className="num">Burns</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {s.days.map((d) => {
                const defl = d.amountTinc > perDay;
                return (
                  <tr key={d.date} className={defl ? 'is-defl' : undefined}>
                    <td>
                      {dayLabel(d.date)}
                      {!d.final ? ' ·' : ''}
                      {!d.final ? <span className="month-open"> filling</span> : null}
                    </td>
                    <td className="num">{fmtInt(d.amountTinc)}</td>
                    <td className="num">{d.transactionCount}</td>
                    <td>
                      <span className="verdict">{defl ? 'deflationary' : 'inflationary'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="lookup-note">
            {coverageLine(s)} A day is deflationary when its burns exceed the {fmtInt(perDay)} TINC minted that day;
            the month&rsquo;s emitted figure counts {fmtInt(perDay)} TINC for each day with data. Days can be revised
            for up to 30 days as the scanner recovers gaps. <Link href="/methodology">Methodology</Link>.
          </p>

          <nav className="month-nav" aria-label="Months">
            {earlier ? (
              <Link href={`/burns/${earlier}`} className="btn btn-ghost">
                ← Earlier month
              </Link>
            ) : (
              <span />
            )}
            <Link href="/burns" className="btn btn-ghost">
              All months
            </Link>
            {later ? (
              <Link href={`/burns/${later}`} className="btn btn-ghost">
                Later month →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
