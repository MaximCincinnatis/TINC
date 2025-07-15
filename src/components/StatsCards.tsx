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

  // Calculate market cap (placeholder - would need real price data)
  const estimatedPrice = 0.001; // Placeholder - would fetch from API
  const marketCap = burnData.totalSupply * estimatedPrice;

  return (
    <div className="stats-grid">
      <div className="stat-card marketcap">
        <div className="stat-header">
          <span className="stat-label">Market Cap</span>
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>
        <div className="stat-value">
          ${formatNumber(marketCap)}<span className="stat-suffix">{formatSuffix(marketCap)}</span>
        </div>
        <div className="stat-description">Estimated market valuation</div>
      </div>

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
              <path d="M12 21C15.5 21 18 18.5 18 15.5C18 14.5 17.7 13.5 17.2 12.7C17 12.4 16.8 12.1 16.5 11.8C16.1 11.3 15.6 11 15 10.7C14.9 10.6 14.7 10.5 14.6 10.4C14.4 10.2 14.1 10 13.9 9.9C13.6 9.6 13.4 9.3 13.1 9C12.8 8.6 12.5 8.1 12.5 7.5C12.5 7.5 12.5 5 12.5 5C12.5 5 12 7 11.2 8.5C10.4 10 9.2 11.2 8.5 12.5C7.8 13.8 7 15 7 16C7 18.8 9.2 21 12 21Z" fill="currentColor"/>
              <rect x="4" y="2" width="16" height="3" rx="1" fill="currentColor" opacity="0.4"/>
              <rect x="6" y="4" width="12" height="1" fill="currentColor" opacity="0.3"/>
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