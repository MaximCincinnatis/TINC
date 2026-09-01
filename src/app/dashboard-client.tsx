'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import StatsCards from '@/components/StatsCards';
import LoadingProgress from '@/components/LoadingProgress';
import AdminPanel from '@/components/AdminPanel';
import HolderLookup from '@/components/HolderLookup';
import DragonRanks from '@/components/DragonRanks';
import { fetchBurnData, setProgressCallback } from '@/services/fileCachedBurnService';
import { BurnData } from '@/types/BurnData';

// chart.js / react-chartjs-2 render to a <canvas> and touch window -> load client-only.
// The chart's DATA still comes from SSR'd props; only the canvas render is deferred to the client.
const BurnChart = dynamic(() => import('@/components/BurnChart'), {
  ssr: false,
  loading: () => (
    <div className="chart-wrapper">
      <div className="chart-container" style={{ minHeight: '400px' }}>
        <div className="loading">
          <div className="loading-spinner" />
          <div className="loading-text">Loading chart…</div>
        </div>
      </div>
    </div>
  ),
});

interface Props {
  // Seeded server-side in app/page.tsx (null when the server read failed -> shell).
  initialData: BurnData | null;
}

/**
 * 2026-09-01 UX walk: replaces the "Beta: verify results" tag, which undermined numbers that
 * are read straight from the chain and validated before every publish. The server renders the
 * absolute UTC time (deterministic); after mount it ticks as a relative age.
 */
function DataFreshness({ fetchedAt }: { fetchedAt?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!fetchedAt) return <p className="beta-warning">On-chain data</p>;
  const ts = new Date(fetchedAt).getTime();
  if (isNaN(ts)) return <p className="beta-warning">On-chain data</p>;
  let when = `${new Date(ts).toISOString().slice(11, 16)} UTC`;
  if (now !== null) {
    const mins = Math.max(0, Math.round((now - ts) / 60_000));
    when = mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  }
  return (
    <p className="beta-warning" title={fetchedAt}>
      On-chain data · updated {when}
    </p>
  );
}

export default function DashboardClient({ initialData }: Props) {
  // Seed from server-fetched props so the real numbers render on the server (SSR win).
  const [burnData, setBurnData] = useState<BurnData | null>(initialData);
  // Only "loading" up front if we have no server data (then the client fetches below).
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingMessage('Loading data...');
      setLoadingProgress(0);

      setProgressCallback((message, progress) => {
        setLoadingMessage(message);
        if (progress !== undefined) {
          setLoadingProgress(progress);
        }
      });

      const data = await fetchBurnData(forceRefresh);
      setBurnData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch burn data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Data already server-rendered from initialData -> don't refetch on mount (avoids a flash).
    // Only fetch client-side if the server read failed (initialData was null).
    if (!initialData) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="brand-section">
              <div className="logo">
                <img
                  src="/Logo.png"
                  alt="TINC Logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="brand-info">
                <h1>
                  <span>TINC</span>
                  <span>Burn</span>
                  <span>.fyi</span>
                </h1>
                <p>龍炎 Dragon Flame Analytics</p>
              </div>
            </div>

            <div className="nav-section">
              <div className="nav-column">
                <a
                  href="https://titanfarms.win/burn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  <img
                    src="/Logo.png"
                    alt="TINC"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  Titan Farms
                </a>
                <DataFreshness fetchedAt={burnData?.fetchedAt} />
              </div>
              <AdminPanel onDataUpdate={() => loadData(false)} />
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {/* 2026-09-01 UX walk: a first-time visitor gets the one-line "what is this", and every
            visitor gets "is TINC deflationary right now" from like-for-like numbers. */}
        <section className="intro-strip">
          <p className="intro-text">
            TINC is Titan Farms&apos; incentive token. Every burn removes TINC from circulation for good;
            supply only shrinks on days when burns beat the{' '}
            {burnData ? Math.round(burnData.emissionPerSecond * 86400).toLocaleString('en-US') : '86,400'} TINC/day emission.
          </p>
          {burnData && typeof burnData.periodEmission === 'number' && typeof burnData.netSupplyChange === 'number' && (
            <p className={`supply-verdict ${burnData.isDeflationary ? 'deflationary' : 'inflationary'}`}>
              Last {burnData.periodDays ?? burnData.dailyBurns.length} days: {burnData.isDeflationary ? 'deflationary' : 'inflationary'} ·{' '}
              {Math.round(burnData.totalBurned).toLocaleString('en-US')} burned vs{' '}
              {Math.round(burnData.periodEmission).toLocaleString('en-US')} emitted · net{' '}
              {burnData.netSupplyChange >= 0 ? '+' : '−'}
              {Math.round(Math.abs(burnData.netSupplyChange)).toLocaleString('en-US')} TINC ·{' '}
              {burnData.deflationaryDays ?? 0} of {burnData.periodDays ?? burnData.dailyBurns.length} days beat the threshold
            </p>
          )}
        </section>
        {loading && (
          <LoadingProgress
            message={loadingMessage}
            progress={loadingProgress}
            subMessage={loadingProgress > 0 ? `${Math.round(loadingProgress)}% complete` : undefined}
          />
        )}

        {error && (
          <div className="error">
            <div className="error-title">⚠️ Error</div>
            <div className="error-message">{error}</div>
          </div>
        )}

        {loading && !burnData && (
          <>
            <div className="stats-grid">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="stat-card" style={{ opacity: 0.3 }}>
                  <div className="stat-header">
                    <div className="stat-label">Loading...</div>
                    <div className="stat-icon" />
                  </div>
                  <div className="stat-value">--</div>
                  <div className="stat-description">--</div>
                </div>
              ))}
            </div>
            <div className="chart-section" style={{ opacity: 0.3, minHeight: '400px' }}>
              <div className="loading">
                <div className="loading-spinner" />
                <div className="loading-text">Loading chart data...</div>
              </div>
            </div>
          </>
        )}

        {burnData && !loading && (
          <>
            <StatsCards burnData={burnData} />
            <div className="chart-section">
              <div className="chart-header">
                <h2 className="chart-title">Daily TINC Burns</h2>
                <p className="chart-subtitle">Last 30 days burn activity</p>
              </div>
              <BurnChart burnData={burnData} />
            </div>

            <DragonRanks burnData={burnData} />

            <HolderLookup />
          </>
        )}
      </main>

      <footer>
        <div
          className="footer-links"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <a href="https://titanfarms.win/burn" target="_blank" rel="noopener noreferrer" className="nav-link">
            Titan Farms
          </a>
          <a
            href="https://etherscan.io/token/tokenholderchart/0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            TINC Holders
          </a>
          <a
            href="https://dexscreener.com/ethereum/0x72e0de1cc2c952326738dac05bacb9e9c25422e3"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            TINC/TitanX
          </a>
        </div>

        <p style={{ marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'rgba(250, 248, 240, 0.5)' }}>
          Contract:{' '}
          <a
            href="https://etherscan.io/address/0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a"
            target="_blank"
            rel="noopener noreferrer"
          >
            0x6532...B385a
          </a>
          {burnData && (
            <span>
              {' '}
              • Updated:{' '}
              {new Date(burnData.fetchedAt).toLocaleString('en-US', {
                timeZone: 'UTC',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
              UTC
            </span>
          )}
          {burnData?.fromCache && <span> • Cached</span>}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(250, 248, 240, 0.35)' }}>
          龍炎 RYŪ-EN • Built for TINC Community
        </p>

        {/* Related tools: cross-links to sibling projects (SEO/UX). Same-tab links with rel="noopener". */}
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'rgba(250, 248, 240, 0.5)' }}>
          Related tools:{' '}
          <a href="https://www.torusinfo.fyi/" rel="noopener">
            TORUS Dashboard
          </a>
          {' • '}
          <a href="https://www.pulsechain.fyi/" rel="noopener">
            PulseChain Privacy Trace
          </a>
        </p>
      </footer>
    </div>
  );
}
