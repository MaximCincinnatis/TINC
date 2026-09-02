import { ImageResponse } from 'next/og';
import { loadBurnData } from '@/lib/loadBurnData';
import { ogFonts, ogDataUri, OG_SIZE, OG } from '@/lib/og';
import { fmtCompact, fmtInt } from '@/lib/format';

/**
 * Site Open Graph image (link previews on Telegram, X, Discord). Rendered at build time from the
 * burn data baked into the deploy, so every publish refreshes the 30-day verdict for free.
 * Replaces the July 2026 static og-image.jpg (a stock fire photo).
 */
export const runtime = 'nodejs';
export const alt = 'TINCBurn.fyi — live Titan Farms TINC burn tracker';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const [fonts, ground, data] = await Promise.all([ogFonts(), ogDataUri('ground.jpg'), loadBurnData()]);

  const days = data?.periodDays ?? data?.dailyBurns?.length ?? 30;
  const hasVerdict = !!data && typeof data.periodEmission === 'number';
  const verdict = data?.isDeflationary ? 'deflationary' : 'inflationary';
  const burned = data ? fmtCompact(data.totalBurned) : null;
  const beat = data?.deflationaryDays ?? 0;
  const threshold = fmtInt((data?.emissionPerSecond ?? 1) * 86400);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          backgroundColor: OG.ink,
          fontFamily: 'Zen Maru Gothic',
          color: OG.cream,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ground} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background: 'linear-gradient(90deg, rgba(15,15,24,0.78) 0%, rgba(15,15,24,0.42) 46%, rgba(15,15,24,0) 68%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 78,
            top: 0,
            height: 630,
            width: 660,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 17, letterSpacing: 4, color: 'rgba(250,248,240,0.62)', textTransform: 'uppercase' }}>
            Titan Farms · TitanX &amp; DragonX ecosystem
          </div>
          <div style={{ display: 'flex', fontFamily: 'Dela Gothic One', fontSize: 84, lineHeight: 1.05, marginTop: 14 }}>
            <span>TINC</span>
            <span style={{ color: OG.gold }}>Burn</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'IBM Plex Mono',
              fontSize: 24,
              lineHeight: 1.55,
              color: 'rgba(250,248,240,0.9)',
              marginTop: 20,
            }}
          >
            <div>Live TINC burn tracker on Ethereum</div>
            {hasVerdict && (
              // Satori: rows are divs (flex on spans is ignored) and must fit their column, or
              // Yoga shrinks the items below their text width and the words overlap.
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex' }}>
                  <div>{`Last ${days} days:`}</div>
                  <div style={{ color: data!.isDeflationary ? OG.jade : OG.gold, marginLeft: 12 }}>{verdict}</div>
                </div>
                <div>{`${burned} burned · ${beat} of ${days} days beat emission`}</div>
              </div>
            )}
          </div>
          {/* Satori: one string per block, so interpolations are folded into a template literal */}
          <div style={{ fontSize: 17, color: 'rgba(250,248,240,0.55)', marginTop: 20 }}>
            {`Daily burns · supply · Dragon Ranks · your rank · threshold ${threshold} TINC per day`}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 54,
            bottom: 40,
            display: 'flex',
            fontFamily: 'Dela Gothic One',
            fontSize: 20,
            color: 'rgba(250,248,240,0.85)',
          }}
        >
          <span>tincburn</span>
          <span style={{ color: OG.gold }}>.fyi</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
