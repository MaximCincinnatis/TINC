import React from 'react';
import type { RankResult } from '@/lib/ranks';
import { fmtInt, fmtPct, fmtTinc } from '@/lib/format';

/**
 * One wallet's Dragon Rank, drawn with the same grammar as the six tier cards (ink gradient,
 * rank-coloured top line, corner bracket, kanji watermark, ghosted tier art, Plex Mono metrics).
 * No hooks, so it renders on the server (rank page) and on the client (lookup) alike.
 */
export default function RankCard({ r }: { r: RankResult }) {
  const tier = r.tier;
  const color = tier?.color ?? '#607D8B';
  const subtitle = tier ? `${tier.subtitle} · rank ${r.rank.toLocaleString('en-US')} of ${r.count.toLocaleString('en-US')}` : 'Below 足軽 Ashigaru';

  let footer: React.ReactNode;
  if (r.next && r.shortfall !== null) {
    footer = (
      <>
        <b>{fmtInt(r.shortfall)} TINC</b> short of {r.next.name}
      </>
    );
  } else if (tier) {
    footer = <>Top rank · nothing above {tier.name}</>;
  } else {
    footer = <>Any TINC balance ranks as 足軽 Ashigaru</>;
  }

  return (
    <div
      className="rank-card lookup-card"
      style={{ '--rank-color': color, '--gradient-from': tier?.gradientFrom ?? color, '--gradient-to': tier?.gradientTo ?? color } as React.CSSProperties}
    >
      {/* eager + sync decode: six ~20 KB WebPs; lazy/async left cards art-less on first paint */}
      {tier && <img className="rank-art" src={tier.art} alt="" decoding="sync" />}
      <div className="rank-corner"></div>

      <div className="rank-header">
        <div className="rank-icon" style={{ color }}>
          {tier ? tier.icon : <span className="rank-icon-kanji">兵</span>}
        </div>
        <div className="rank-title-group">
          <div className="rank-name">{tier ? tier.name : 'Unranked'}</div>
          <div className="rank-subtitle">{subtitle}</div>
        </div>
        <div className="rank-kanji" style={{ color }}>
          {tier?.kanji ?? '兵'}
        </div>
      </div>

      <div className="rank-metrics">
        <div className="metric">
          <span className="metric-value">{fmtTinc(r.balance)}</span>
          <span className="metric-label">TINC</span>
        </div>
        <div className="metric">
          <span className="metric-value">{fmtPct(r.pct)}</span>
          <span className="metric-label">of supply</span>
        </div>
        <div className="metric">
          <span className="metric-value">#{r.rank.toLocaleString('en-US')}</span>
          <span className="metric-label">holder rank</span>
        </div>
      </div>

      <div className="rank-bar">
        <div
          className="rank-fill"
          style={{
            width: `${Math.round(r.progress * 100)}%`,
            background: `linear-gradient(90deg, ${tier?.gradientFrom ?? color}, ${tier?.gradientTo ?? color})`,
          }}
        ></div>
      </div>

      <div className="rank-footer">{footer}</div>
    </div>
  );
}
