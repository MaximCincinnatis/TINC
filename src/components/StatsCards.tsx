import React from 'react';
import { BurnData } from '../types/BurnData';

interface Props {
  burnData: BurnData;
}

// Component no longer uses SVG icons - using CSS-based icons instead

const StatsCards: React.FC<Props> = ({ burnData }) => {
  const totalTransactions = burnData.dailyBurns.reduce((sum, day) => sum + day.transactionCount, 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1);
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0);
    }
    return num.toFixed(0);
  };

  const formatSuffix = (num: number) => {
    if (num >= 1000000) return 'M';
    if (num >= 1000) return 'K';
    return '';
  };

  return (
    <div className="stats-grid">
      <div className="stat-card supply">
        <div className="stat-header">
          <span className="stat-label">Circulating Supply</span>
          <div className="stat-icon" />
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalSupply)}<span className="stat-suffix">{formatSuffix(burnData.totalSupply)}</span>
        </div>
        <div className="stat-description">Current TINC tokens in circulation</div>
      </div>

      <div className="stat-card burned">
        <div className="stat-header">
          <span className="stat-label">Total Burned</span>
          <div className="stat-icon" />
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalBurned)}<span className="stat-suffix">{formatSuffix(burnData.totalBurned)}</span>
        </div>
        <div className="stat-description">TINC tokens removed from circulation</div>
      </div>
      
      <div className="stat-card transactions">
        <div className="stat-header">
          <span className="stat-label">Total Transactions</span>
          <div className="stat-icon" />
        </div>
        <div className="stat-value">
          {formatNumber(totalTransactions)}<span className="stat-suffix">{formatSuffix(totalTransactions)}</span>
        </div>
        <div className="stat-description">Burn transactions over 30 days</div>
      </div>
      
      <div className="stat-card thirty-day">
        <div className="stat-header">
          <span className="stat-label">30-Day Burns</span>
          <div className="stat-icon" />
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalBurned)}<span className="stat-suffix">{formatSuffix(burnData.totalBurned)}</span>
        </div>
        <div className="stat-description">TINC burned in last 30 days</div>
      </div>
      
      <div className="stat-card emission">
        <div className="stat-header">
          <span className="stat-label">Emission Rate</span>
          <div className="stat-icon" />
        </div>
        <div className="stat-value">
          {burnData.emissionPerSecond.toFixed(1)}
          <span className="stat-suffix">TINC/SEC</span>
        </div>
        <div className="stat-description">
          {burnData.isDeflationary ? (
            'Tokens being created per second'
          ) : (
            'Tokens being created per second'
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCards;