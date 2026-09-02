import { ImageResponse } from 'next/og';
import { loadHolders } from '@/lib/holders';
import { normalizeAddress, rankLookup } from '@/lib/ranks';
import { ogFonts, ogDataUri, OG_SIZE, OG } from '@/lib/og';
import { fmtInt, fmtPct, fmtTinc, fmtUtcDate } from '@/lib/format';

/**
 * The shareable rank card: what a /rank/<address> link unfurls as on Telegram, X and Discord.
 * Same grammar as the on-page rank card, tier art at full strength on the right, numbers
 * typeset live (never baked into the illustration).
 */
export const runtime = 'nodejs';
export const alt = 'TINC Dragon Rank card';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { address: string } }) {
  const addr = normalizeAddress(params.address);
  const [fonts, file] = await Promise.all([ogFonts(), loadHolders()]);
  const r = addr && file ? rankLookup(file, addr) : null;
  const tier = r?.tier ?? null;
  const color = tier?.color ?? OG.jade;
  const art = tier ? await ogDataUri(`art-${tier.key}.png`) : null;
  const [kanji, ...latin] = (tier?.name ?? '').split(' ');

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          backgroundColor: OG.ink,
          backgroundImage:
            'radial-gradient(ellipse at 12% 0%, rgba(0,212,170,0.22), rgba(15,15,24,0) 55%), radial-gradient(ellipse at 4% 100%, rgba(245,166,35,0.16), rgba(15,15,24,0) 50%)',
          fontFamily: 'Zen Maru Gothic',
          color: OG.cream,
        }}
      >
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} width={720} height={720} alt="" style={{ position: 'absolute', right: -70, top: -45 }} />
        )}
        <div
          style={{
            position: 'absolute',
            left: 78,
            top: 0,
            height: 630,
            width: 640,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 17, letterSpacing: 4, color: 'rgba(250,248,240,0.62)', textTransform: 'uppercase' }}>
            tincburn.fyi · 龍階 Dragon Ranks
          </div>

          {/* Satori: no fragments (children would not stack) and flex rows are divs, never spans */}
          {r && tier ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'Dela Gothic One', fontSize: 76, lineHeight: 1.05, marginTop: 14 }}>
                <div style={{ color }}>{kanji}</div>
                <div style={{ marginLeft: 20 }}>{latin.join(' ')}</div>
              </div>
              <div style={{ fontSize: 19, letterSpacing: 3, color: 'rgba(250,248,240,0.55)', textTransform: 'uppercase', marginTop: 8 }}>
                {tier.subtitle}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 27,
                  lineHeight: 1.55,
                  color: 'rgba(250,248,240,0.92)',
                  marginTop: 26,
                }}
              >
                <div style={{ display: 'flex' }}>
                  <div>Rank</div>
                  <div style={{ color: OG.gold, marginLeft: 10, marginRight: 10 }}>{`#${r.rank.toLocaleString('en-US')}`}</div>
                  <div>{`of ${r.count.toLocaleString('en-US')} holders`}</div>
                </div>
                <div>{`${fmtTinc(r.balance)} TINC · ${fmtPct(r.pct)} of supply`}</div>
              </div>
              <div style={{ display: 'flex', fontSize: 19, color: 'rgba(250,248,240,0.6)', marginTop: 22 }}>
                {r.next && r.shortfall !== null ? (
                  <div style={{ display: 'flex' }}>
                    <div style={{ color: OG.gold, marginRight: 8 }}>{`${fmtInt(r.shortfall)} TINC`}</div>
                    <div>{`short of ${r.next.name} · ${fmtUtcDate(r.updatedAt)}`}</div>
                  </div>
                ) : (
                  <div>{`Top rank · ${fmtUtcDate(r.updatedAt)}`}</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'Dela Gothic One', fontSize: 64, lineHeight: 1.1, marginTop: 14 }}>Not ranked yet</div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 24, lineHeight: 1.55, color: 'rgba(250,248,240,0.85)', marginTop: 22 }}>
                {addr ? 'Not in the current holder snapshot' : 'Look up any wallet on tincburn.fyi'}
              </div>
              <div style={{ fontSize: 18, color: 'rgba(250,248,240,0.55)', marginTop: 18 }}>
                Six ranks from 足軽 Ashigaru to 龍神 Ryūjin · public on-chain balances
              </div>
            </div>
          )}
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
