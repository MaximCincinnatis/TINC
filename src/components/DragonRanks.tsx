'use client';

import React from 'react';
import { BurnData } from '../types/BurnData';
import { RANK_TIERS } from '@/lib/ranks';
import HolderLookup from './HolderLookup';
import type { RankResult } from '@/lib/ranks';

// 龍階 Dragon Ranks - Japanese/Samurai inspired holder tiers

interface Props {
  burnData: BurnData;
  example?: RankResult | null;
}

interface HolderStats {
  ryujin: number;      // Was poseidon
  shogun: number;      // Was whale
  daimyo: number;      // Was shark
  samurai: number;     // Was dolphin
  ronin: number;       // Was squid
  ashigaru: number;    // Was shrimp
  totalHolders: number;
  top10Percentage?: number;
}

const DragonRanks: React.FC<Props> = ({ burnData, example = null }) => {
  const totalSupply = burnData.totalSupply;
  // Derive holder tiers directly from the server-seeded props (no effect/state) so the REAL
  // holder numbers are server-rendered into the HTML. Falls back to representative defaults
  // only when holderStats is absent from the data.
  const holderStats: HolderStats = burnData.holderStats
    ? {
        ryujin: burnData.holderStats.poseidon,
        shogun: burnData.holderStats.whale,
        daimyo: burnData.holderStats.shark,
        samurai: burnData.holderStats.dolphin,
        ronin: burnData.holderStats.squid,
        ashigaru: burnData.holderStats.shrimp,
        totalHolders: burnData.holderStats.totalHolders,
        top10Percentage: burnData.holderStats.top10Percentage,
      }
    : {
        ryujin: 2,
        shogun: 8,
        daimyo: 45,
        samurai: 287,
        ronin: 1842,
        ashigaru: 3516,
        totalHolders: 984,
      };

  // Tier definitions live in src/lib/ranks.tsx (shared with the rank lookup + share card).
  const classifications = RANK_TIERS.map((tier) => ({
    ...tier,
    amount: (totalSupply * tier.percentage) / 100,
    holders: holderStats[tier.key],
  }));

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toLocaleString('en-US');
  };

  return (
    <div className="dragon-ranks-container">
      {/* Header with Japanese styling */}
      <div className="dragon-ranks-header">
        <div className="header-content">
          <div className="title-section">
            <h2 className="main-title">
              <span className="kanji-accent">龍階</span> Dragon Ranks
            </h2>
            <p className="subtitle">Holder classification by supply percentage</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Warriors</span>
              <span className="stat-value">{holderStats.totalHolders.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ranks-grid">
          {classifications.map((rank, index) => (
            <div
              key={index}
              className="rank-card"
              style={{
                '--rank-color': rank.color,
                '--gradient-from': rank.gradientFrom,
                '--gradient-to': rank.gradientTo,
              } as React.CSSProperties}
            >
              {/* Decorative corner */}
              <div className="rank-corner"></div>
              <img className="rank-art" src={rank.art} alt="" decoding="sync" />

              <div className="rank-header">
                <div className="rank-icon" style={{ color: rank.color }}>
                  {rank.icon}
                </div>
                <div className="rank-title-group">
                  <div className="rank-name">{rank.name}</div>
                  <div className="rank-subtitle">{rank.subtitle}</div>
                </div>
                <div className="rank-kanji" style={{ color: rank.color }}>
                  {rank.kanji}
                </div>
              </div>

              <div className="rank-threshold">
                <span className="threshold-value" style={{ color: rank.color }}>
                  {rank.percentage > 0 ? `${rank.percentage}%+` : 'Any'}
                </span>
                <span className="threshold-label">{rank.percentage > 0 ? 'of supply' : 'TINC balance'}</span>
              </div>

              <div className="rank-metrics">
                <div className="metric">
                  <span className="metric-value">{rank.holders.toLocaleString('en-US')}</span>
                  <span className="metric-label">Holders</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{rank.amount > 0 ? formatNumber(rank.amount) : '> 0'}</span>
                  <span className="metric-label">Min TINC</span>
                </div>
              </div>

              <div className="rank-bar">
                <div
                  className="rank-fill"
                  style={{
                    width: `${Math.min((rank.holders / Math.max(...classifications.map(c => c.holders))) * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${rank.gradientFrom}, ${rank.gradientTo})`
                  }}
                ></div>
              </div>

              <div className="rank-footer">
                {((rank.holders / holderStats.totalHolders) * 100).toFixed(1)}% of warriors
              </div>
            </div>
          ))}
        </div>

      {/* 位 Find your rank (2026-09-02): answers with a rank card in the wallet's tier colour */}
      <HolderLookup example={example} />

      {/* Summary */}
      <div className="ranks-summary">
        <div className="summary-header">
          <h3><span className="kanji-small">概要</span> Overview</h3>
          <span className="last-updated">
            {burnData.fetchedAt
              ? `${new Date(burnData.fetchedAt).toLocaleString('en-US', {
                  timeZone: 'UTC',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })} UTC`
              : ''}
          </span>
        </div>
        <div className="summary-metrics">
          <div className="summary-item">
            <span className="summary-label">Elite Ranks (龍神 + 将軍)</span>
            <span className="summary-value">{holderStats.ryujin + holderStats.shogun}</span>
          </div>
          {holderStats.top10Percentage !== undefined && (
            <div className="summary-item">
              <span className="summary-label">Top 10 Control</span>
              <span className="summary-value">{holderStats.top10Percentage.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DragonRanks;
