import Link from 'next/link';

/**
 * Header and footer for the secondary pages (/methodology, /burns): the rank page's chrome, with
 * the eyebrow naming the page and one way back. Server components; no state.
 */
export function SiteHeader({ eyebrow }: { eyebrow: string }) {
  return (
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
              <p>{eyebrow}</p>
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
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-links" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Link href="/" className="nav-link">
          Burn tracker
        </Link>
        <Link href="/methodology" className="nav-link">
          Methodology
        </Link>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'rgba(250, 248, 240, 0.35)' }}>龍炎 RYŪ-EN • Built for TINC Community</p>
    </footer>
  );
}
