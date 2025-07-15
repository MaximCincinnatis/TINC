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
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
              <circle cx="12" cy="12" r="6" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalSupply)}<span className="stat-suffix">{formatSuffix(burnData.totalSupply)}</span>
        </div>
        <div className="stat-description">Current TINC tokens in circulation</div>
      </div>

      <div className="stat-card burned">
        <div className="stat-header">
          <span className="stat-label">Total Burned</span>
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2ZM12 4L20 12L12 20L4 12L12 4Z" opacity="0.5"/>
              <path d="M8 12L16 12M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalBurned)}<span className="stat-suffix">{formatSuffix(burnData.totalBurned)}</span>
        </div>
        <div className="stat-description">TINC tokens removed from circulation</div>
      </div>
      
      <div className="stat-card transactions">
        <div className="stat-header">
          <span className="stat-label">Total Transactions</span>
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <rect x="3" y="3" width="7" height="7" rx="1" opacity="0.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1" opacity="0.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1" opacity="0.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1" opacity="0.5"/>
            </svg>
          </div>
        </div>
        <div className="stat-value">
          {formatNumber(totalTransactions)}<span className="stat-suffix">{formatSuffix(totalTransactions)}</span>
        </div>
        <div className="stat-description">Burn transactions over 30 days</div>
      </div>
      
      <div className="stat-card thirty-day">
        <div className="stat-header">
          <span className="stat-label">30-Day Burns</span>
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M7 2V5M17 2V5M3 8H21M5 4H19C20.1 4 21 4.9 21 6V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V6C3 4.9 3.9 4 5 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
              <circle cx="12" cy="14" r="3" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div className="stat-value">
          {formatNumber(burnData.totalBurned)}<span className="stat-suffix">{formatSuffix(burnData.totalBurned)}</span>
        </div>
        <div className="stat-description">TINC burned in last 30 days</div>
      </div>
      
      <div className="stat-card emission">
        <div className="stat-header">
          <span className="stat-label">Emission Rate</span>
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2L13.09 8.26L19 7L15.45 11.82L21 16L14.5 16L12 22L9.5 16L3 16L8.55 11.82L5 7L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
          </div>
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