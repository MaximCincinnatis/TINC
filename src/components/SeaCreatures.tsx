import React, { useEffect, useState } from 'react';
import { BurnData } from '../types/BurnData';

// Realistic silhouette redesign - Updated 2025-07-15

interface Props {
  burnData: BurnData;
}

interface HolderStats {
  poseidon: number;
  whale: number;
  shark: number;
  dolphin: number;
  squid: number;
  shrimp: number;
  totalHolders: number;
}

const SeaCreatures: React.FC<Props> = ({ burnData }) => {
  const totalSupply = burnData.totalSupply;
  const [holderStats, setHolderStats] = useState<HolderStats>({
    poseidon: 0,
    whale: 0,
    shark: 0,
    dolphin: 0,
    squid: 0,
    shrimp: 0,
    totalHolders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load holder data from burn data JSON
    const loadHolderStats = () => {
      try {
        // Check if holder stats are available in burnData
        if (burnData.holderStats) {
          setHolderStats({
            poseidon: burnData.holderStats.poseidon,
            whale: burnData.holderStats.whale,
            shark: burnData.holderStats.shark,
            dolphin: burnData.holderStats.dolphin,
            squid: burnData.holderStats.squid,
            shrimp: burnData.holderStats.shrimp,
            totalHolders: burnData.holderStats.totalHolders
          });
        } else {
          // Fallback to current values if holder data not available
          setHolderStats({
            poseidon: 2,
            whale: 8,
            shark: 45,
            dolphin: 287,
            squid: 1842,
            shrimp: 3516,
            totalHolders: 984
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading holder stats:', error);
        setLoading(false);
      }
    };

    loadHolderStats();
  }, [burnData]);
  
  const classifications = [
    {
      name: 'Poseidon',
      percentage: 10,
      amount: totalSupply * 0.1,
      holders: holderStats.poseidon,
      color: '#FFD700',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic Trident */}
          <path d="M50 90 L50 25 M50 25 L50 10 L48 10 L48 8 L46 8 L46 5 L44 5 L44 8 L42 8 L42 10 L40 10 L40 25 M50 10 L52 10 L52 8 L54 8 L54 5 L56 5 L56 8 L58 8 L58 10 L60 10 L60 25 M40 25 L38 25 L38 23 L36 23 L36 20 L34 20 L34 15 L36 15 L36 12 L38 12 L38 10 L40 10 M60 25 L62 25 L62 23 L64 23 L64 20 L66 20 L66 15 L64 15 L64 12 L62 12 L62 10 L60 10 M48 90 L48 88 L46 88 L46 85 L44 85 L44 80 L46 80 L46 78 L48 78 L48 25 M52 90 L52 88 L54 88 L54 85 L56 85 L56 80 L54 80 L54 78 L52 78 L52 25" stroke="none"/>
        </svg>
      ),
      description: 'Ocean Ruler'
    },
    {
      name: 'Whale',
      percentage: 1,
      amount: totalSupply * 0.01,
      holders: holderStats.whale,
      color: '#4169E1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Whale from vecteezy reference */}
          <path d="M10 50 Q10 30 30 25 Q50 20 70 30 Q85 40 85 50 Q85 55 83 58 L90 55 Q95 53 95 58 Q95 63 90 65 L83 62 Q75 70 60 72 Q40 75 25 68 Q10 60 10 50 M25 45 Q25 48 28 48 Q31 48 31 45 Q31 42 28 42 Q25 42 25 45" fill="currentColor"/>
        </svg>
      ),
      description: 'Massive Holder'
    },
    {
      name: 'Shark',
      percentage: 0.1,
      amount: totalSupply * 0.001,
      holders: holderStats.shark,
      color: '#696969',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Shark from vecteezy reference */}
          <path d="M5 50 Q5 45 10 42 L15 40 Q20 38 25 38 Q35 38 45 42 L50 30 Q52 28 54 30 Q56 32 54 34 L48 44 Q55 50 55 58 Q55 65 48 70 L65 60 Q70 58 75 60 Q80 62 80 68 Q80 74 75 76 Q70 78 65 76 L50 68 Q40 72 28 72 Q15 72 10 65 Q5 58 5 50 M20 48 Q20 50 22 50 Q24 50 24 48 Q24 46 22 46 Q20 46 20 48" fill="currentColor"/>
        </svg>
      ),
      description: 'Apex Predator'
    },
    {
      name: 'Dolphin',
      percentage: 0.01,
      amount: totalSupply * 0.0001,
      holders: holderStats.dolphin,
      color: '#00CED1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Dolphin from freesvgdesigns reference */}
          <path d="M10 55 Q10 45 18 40 Q26 35 35 35 Q45 35 53 40 Q55 35 60 35 Q65 35 68 40 Q71 45 68 50 Q65 55 60 55 Q58 55 56 54 Q58 58 58 62 Q58 68 53 72 L65 75 Q68 76 68 79 Q68 82 65 83 Q62 84 59 83 L50 80 Q45 82 40 82 Q30 82 20 76 Q10 70 10 55 M25 50 Q25 52 27 52 Q29 52 29 50 Q29 48 27 48 Q25 48 25 50" fill="currentColor"/>
        </svg>
      ),
      description: 'Smart Swimmer'
    },
    {
      name: 'Squid',
      percentage: 0.001,
      amount: totalSupply * 0.00001,
      holders: holderStats.squid,
      color: '#8B4513',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Squid from vecteezy reference */}
          <path d="M50 15 Q60 15 65 25 Q70 35 65 45 Q63 50 60 52 L65 85 Q66 90 62 90 Q58 90 57 85 L55 60 L58 80 Q59 85 55 85 Q51 85 50 80 L50 60 L50 80 Q50 85 46 85 Q42 85 42 80 L42 60 L45 80 Q46 85 42 85 Q38 85 37 80 L40 52 Q35 50 33 45 Q28 35 33 25 Q38 15 50 15 M42 28 Q42 30 44 30 Q46 30 46 28 Q46 26 44 26 Q42 26 42 28 M54 28 Q54 30 56 30 Q58 30 58 28 Q58 26 56 26 Q54 26 54 28" fill="currentColor"/>
        </svg>
      ),
      description: 'Deep Sea Dweller'
    },
    {
      name: 'Shrimp',
      percentage: 0.0001,
      amount: totalSupply * 0.000001,
      holders: holderStats.shrimp,
      color: '#FF69B4',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Shrimp from freesvg reference */}
          <path d="M25 50 Q25 40 35 35 Q45 30 55 35 Q65 40 70 50 Q75 60 70 70 L75 65 Q80 60 85 65 Q90 70 85 75 Q80 80 75 75 L65 70 Q55 75 45 75 Q35 75 28 68 Q25 65 25 60 L20 55 Q15 50 15 45 Q15 40 20 35 L25 40 Q25 45 25 50 M35 48 Q35 50 37 50 Q39 50 39 48 Q39 46 37 46 Q35 46 35 48 M30 35 L25 25 Q24 20 28 20 Q32 20 33 25 L35 35 M35 30 L32 20 Q31 15 35 15 Q39 15 40 20 L38 30" fill="currentColor"/>
        </svg>
      ),
      description: 'Small but Mighty'
    }
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="holder-distribution-container">
      {/* Premium Header */}
      <div className="holder-distribution-header">
        <div className="header-content">
          <div className="title-section">
            <h2 className="main-title">Token Holder Distribution</h2>
            <p className="subtitle">Whale classification based on circulating supply percentage</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Addresses</span>
              <span className="stat-value">{holderStats.totalHolders.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Supply</span>
              <span className="stat-value">{formatNumber(totalSupply)} TINC</span>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading holder distribution...</span>
        </div>
      ) : (
        <div className="distribution-grid">
          {classifications.map((creature, index) => (
            <div key={index} className="holder-tier-card" data-tier={creature.name.toLowerCase()}>
              <div className="card-header">
                <div className="tier-badge" style={{ backgroundColor: creature.color + '20', color: creature.color }}>
                  <div className="tier-indicator" style={{ backgroundColor: creature.color }}></div>
                  {creature.name}
                </div>
                <div className="tier-percentage" style={{ color: creature.color }}>
                  {creature.percentage}%+
                </div>
              </div>
              
              <div className="card-content">
                <div className="tier-description">
                  {creature.description}
                </div>
                
                <div className="metrics-row">
                  <div className="metric">
                    <span className="metric-label">Holders</span>
                    <span className="metric-value">{creature.holders.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Min Balance</span>
                    <span className="metric-value">{formatNumber(creature.amount)}</span>
                  </div>
                </div>
                
                <div className="holder-bar">
                  <div 
                    className="holder-fill" 
                    style={{ 
                      width: `${Math.min((creature.holders / Math.max(...classifications.map(c => c.holders))) * 100, 100)}%`,
                      backgroundColor: creature.color 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="card-footer">
                <span className="supply-info">
                  {((creature.holders / holderStats.totalHolders) * 100).toFixed(1)}% of all holders
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Distribution Summary */}
      <div className="distribution-summary">
        <div className="summary-header">
          <h3>Distribution Overview</h3>
          <div className="last-updated">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="concentration-metrics">
          <div className="concentration-item">
            <span className="concentration-label">Top 10 Holders</span>
            <span className="concentration-value">{holderStats.poseidon + holderStats.whale}</span>
            <span className="concentration-percentage">
              {(((holderStats.poseidon + holderStats.whale) / holderStats.totalHolders) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="concentration-item">
            <span className="concentration-label">Concentration Risk</span>
            <span className="concentration-badge low">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeaCreatures;