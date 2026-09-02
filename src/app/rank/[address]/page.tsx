import type { Metadata } from 'next';
import Link from 'next/link';
import { loadHolders } from '@/lib/holders';
import { normalizeAddress, rankLookup, type RankResult } from '@/lib/ranks';
import RankCard from '@/components/RankCard';
import CopyLinkButton from '@/components/CopyLinkButton';
import { fmtInt, fmtPct, fmtTinc, fmtUtcClock } from '@/lib/format';

/**
 * /rank/<address>: a permalink for one wallet's Dragon Rank. The page is the card plus a way
 * back; the value is the link preview (opengraph-image.tsx next to this file), which is what
 * gets pasted into Telegram and X. Re-rendered at most every 5 minutes, like the home page.
 */
export const revalidate = 300;

const SITE = 'https://www.tincburn.fyi';

async function resolve(param: string): Promise<{ addr: string | null; r: RankResult | null }> {
  const addr = normalizeAddress(param);
  const file = addr ? await loadHolders() : null;
  return { addr, r: addr && file ? rankLookup(file, addr) : null };
}

export async function generateMetadata({ params }: { params: { address: string } }): Promise<Metadata> {
  const { addr, r } = await resolve(params.address);
  const title = r?.tier
    ? `${r.tier.name} · rank #${r.rank.toLocaleString('en-US')} of ${r.count.toLocaleString('en-US')} · TINCBurn.fyi`
    : 'TINC Dragon Rank · TINCBurn.fyi';
  const description = r
    ? `${fmtTinc(r.balance)} TINC · ${fmtPct(r.pct)} of supply${r.next && r.shortfall !== null ? ` · ${fmtInt(r.shortfall)} TINC short of ${r.next.name}` : ''}`
    : "Look up any wallet's Dragon Rank on the Titan Farms TINC burn tracker.";
  const url = `${SITE}/rank/${addr ?? ''}`;
  return {
    title,
    description,
    // Per-wallet pages are share targets, not search targets: keep the index for the home page.
    robots: { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'TINCBurn.fyi' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function RankPage({ params }: { params: { address: string } }) {
  const { addr, r } = await resolve(params.address);
  const url = `${SITE}/rank/${addr ?? ''}`;

  return (
    <div className="App">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="brand-section">
              <Link href="/" className="logo" aria-label="TINCBurn.fyi home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Logo.png" alt="TINC Logo" />
              </Link>
              <div className="brand-info">
                <h1>
                  <span>TINC</span>
                  <span>Burn</span>
                  <span>.fyi</span>
                </h1>
                <p>龍階 Dragon Rank card</p>
              </div>
            </div>
            <div className="nav-section">
              <div className="nav-column">
                <Link href="/" className="nav-link">
                  ← Burn tracker
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container rank-page">
        {r ? (
          <>
            <RankCard r={r} />
            <div className="lookup-share">
              <CopyLinkButton url={url} />
              <Link href="/#find-your-rank" className="btn btn-ghost">
                Look up another wallet
              </Link>
            </div>
            <p className="lookup-note">
              Snapshot {fmtUtcClock(r.updatedAt)} · public on-chain balances · excludes LP positions · {r.address}
            </p>
          </>
        ) : (
          <>
            <div className="rank-card lookup-panel" style={{ '--rank-color': '#00D4AA' } as React.CSSProperties}>
              <div className="rank-corner"></div>
              <div className="lookup-title">
                <span className="kanji-small">位</span> {addr ? 'Not ranked yet' : 'That is not a wallet address'}
              </div>
              <p className="lookup-note">
                {addr
                  ? 'This wallet is not in the current holder snapshot: no TINC balance at that time, only an LP position, or the snapshot is not available right now.'
                  : 'A wallet address is 0x followed by 40 hex characters.'}
              </p>
            </div>
            <div className="lookup-share">
              <Link href="/#find-your-rank" className="btn btn-ghost">
                Look up a wallet
              </Link>
            </div>
          </>
        )}
      </main>

      <footer>
        <p style={{ fontSize: '0.75rem', color: 'rgba(250, 248, 240, 0.35)' }}>龍炎 RYŪ-EN • Built for TINC Community</p>
      </footer>
    </div>
  );
}
