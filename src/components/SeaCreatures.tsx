import React from 'react';
import { BurnData } from '../types/BurnData';

// Realistic silhouette redesign - Updated 2025-07-15

interface Props {
  burnData: BurnData;
}

const SeaCreatures: React.FC<Props> = ({ burnData }) => {
  const totalSupply = burnData.totalSupply;
  
  const classifications = [
    {
      name: 'Poseidon',
      percentage: 10,
      amount: totalSupply * 0.1,
      color: '#FFD700',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic trident silhouette - based on noun project style */}
          <path d="M50 10v80M35 10v15l-5-5v-10h5zm15 0v10l5 5v-15h-5zm-15 0l-5-5v15l5-10zm30 0v15l5-10v-5l-5 0zm-30 5h30v5h-30v-5zm15 75c-3 0-5 2-5 5h10c0-3-2-5-5-5z" fill="currentColor"/>
        </svg>
      ),
      description: 'Ocean Ruler'
    },
    {
      name: 'Whale',
      percentage: 1,
      amount: totalSupply * 0.01,
      color: '#4169E1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic whale silhouette - based on vecteezy style */}
          <path d="M5 50c0-15 8-25 20-28 5-1 10-1 15 0 5 1 10 3 15 5 5 2 9 5 13 9 4 4 7 9 8 14 1 5 1 10-1 15-2 5-5 9-9 12-4 3-9 5-14 6-5 1-10 1-15 0-5-1-10-3-14-6-4-3-8-7-10-12-2-5-3-10-3-15zm15-5c0 2 1 3 3 3s3-1 3-3-1-3-3-3-3 1-3 3zm65-10c5-3 10-4 15-2 5 2 8 6 8 12 0 6-3 10-8 12-5 2-10 1-15-2 2-7 2-13 0-20zm0 30c5-3 10-4 15-2 5 2 8 6 8 12 0 6-3 10-8 12-5 2-10 1-15-2 2-7 2-13 0-20z" fill="currentColor"/>
        </svg>
      ),
      description: 'Massive Holder'
    },
    {
      name: 'Shark',
      percentage: 0.1,
      amount: totalSupply * 0.001,
      color: '#696969',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic shark silhouette - based on vecteezy style */}
          <path d="M10 50c0-5 2-9 5-12 3-3 7-5 12-5 2 0 4 0 6 1l8-15c1-1 2-2 3-1 1 1 1 2 0 3l-7 13c3 2 5 4 6 7l12-18c1-1 2-1 3 0s1 2 0 3l-11 17c1 2 1 4 1 6 0 1 0 2 0 3l20-5c1 0 2 1 2 2s-1 2-2 2l-19 5c-1 3-3 5-5 7l25 10c1 0 1 2 0 3s-2 1-3 0l-24-10c-2 1-4 1-6 1-5 0-9-2-12-5s-5-7-5-12zm12-3c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2zm30-18l8-12c1-1 2-1 3 0s1 2 0 3l-8 12-3-3zm25 21c10-2 15 1 15 5s-5 7-15 5c-10-2-15-5-15-9s5-7 15-1z" fill="currentColor"/>
        </svg>
      ),
      description: 'Apex Predator'
    },
    {
      name: 'Dolphin',
      percentage: 0.01,
      amount: totalSupply * 0.0001,
      color: '#00CED1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic dolphin silhouette */}
          <path d="M15 50c0-8 3-15 8-20s12-8 20-8c8 0 15 3 20 8s8 12 8 20c0 4-1 8-3 11l8 8c2 2 2 5 0 7s-5 2-7 0l-8-8c-3 2-7 3-11 3-8 0-15-3-20-8s-8-12-8-20zm12-5c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2zm28-15c-2-5-6-8-11-8-3 0-6 1-8 3 1 3 3 6 6 8 3 2 6 3 9 3 2 0 3-2 4-6zm10 20c2-3 3-6 3-10 0-5-2-9-5-12-3-3-7-5-12-5-2 0-4 0-6 1 2 4 2 8 0 12s-6 7-11 8c1 3 3 5 5 7 3 3 7 4 11 4 5 0 9-2 12-5zm-10 15c5-3 8-8 10-14-3 1-6 2-10 2-4 0-8-1-11-3-3-2-5-5-6-8-1 3-2 7-2 10 0 5 2 10 5 13 3 3 8 3 14 0z" fill="currentColor"/>
        </svg>
      ),
      description: 'Smart Swimmer'
    },
    {
      name: 'Squid',
      percentage: 0.001,
      amount: totalSupply * 0.00001,
      color: '#8B4513',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic squid silhouette - based on vecteezy style */}
          <path d="M50 20c-5 0-10 3-12 8-2 5-2 11 0 16 1 3 3 5 5 7l-3 15c-1 4-2 8-3 12-1 4-3 8-5 11-2 3-4 5-7 6 3-1 5-3 6-6 1-3 2-7 2-11 0-4 0-8 1-12l2-12-5 20c-1 5-3 10-6 14-3 4-7 6-11 7 4-1 7-3 9-7 2-4 3-9 4-14l3-15 1 18c0 5-1 10-3 14-2 4-5 7-9 8 4-1 7-4 8-8 1-4 2-9 2-14v-15l3 20c1 5 1 10-1 14-2 4-5 7-9 8 4-1 7-4 8-8 1-4 1-9 0-14l-2-15 5 18c2 5 2 10 1 14-1 4-4 7-8 8 4-1 6-4 7-8 1-4 0-9-1-14l-4-15 7 15c3 4 4 8 4 12 0 4-2 7-5 9 3-2 5-5 5-9 0-4-1-8-4-12l-6-12c2-2 4-4 5-7 2-5 2-11 0-16-2-5-7-8-12-8zm-6 12c0-2 1-3 3-3s3 1 3 3-1 3-3 3-3-1-3-3zm12 0c0-2 1-3 3-3s3 1 3 3-1 3-3 3-3-1-3-3z" fill="currentColor"/>
        </svg>
      ),
      description: 'Deep Sea Dweller'
    },
    {
      name: 'Shrimp',
      percentage: 0.0001,
      amount: totalSupply * 0.000001,
      color: '#FF69B4',
      icon: (
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          {/* Realistic shrimp silhouette - based on freesvg style */}
          <path d="M15 50c0-10 5-18 12-20 4-1 8 0 11 2 3 2 5 5 6 8 1 3 1 6 0 9s-3 5-5 7l-3 2 15 2c3 0 5 2 5 5s-2 5-5 5l-12-1 18 8c3 1 4 4 3 7s-4 4-7 3l-15-7 12 12c2 2 2 5 0 7s-5 2-7 0l-10-10c-5-2-9-6-11-11-2-5-2-10 0-15zm10-5c0 2 1 3 3 3s3-1 3-3-1-3-3-3-3 1-3 3zm-10-10c-2-1-3-3-2-5s3-3 5-2l5 3c-3 1-6 2-8 4zm-5 15c-2 0-4-1-4-3s1-4 3-4l4 1c-1 2-2 4-3 6zm12-15l-8-10c-2-2-2-5 0-7s5-2 7 0l5 7c-2 3-3 6-4 10zm6-10l-5-15c-1-3 1-5 4-6s5 1 6 4l2 12c-3 1-5 3-7 5z" fill="currentColor"/>
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
    <div className="sea-creatures-section">
      <div className="sea-creatures-header">
        <h2>TINC Holder Classifications</h2>
        <p>Based on percentage of circulating supply</p>
      </div>
      
      <div className="sea-creatures-list">
        {classifications.map((creature, index) => (
          <div key={index} className="creature-row" style={{ borderLeftColor: creature.color }}>
            <div className="creature-icon" style={{ color: creature.color }}>
              {creature.icon}
            </div>
            
            <div className="creature-info">
              <div className="creature-name" style={{ color: creature.color }}>
                {creature.name}
              </div>
              <div className="creature-description">
                {creature.description}
              </div>
            </div>
            
            <div className="creature-percentage">
              {creature.percentage}% of supply
            </div>
            
            <div className="creature-amount">
              {formatNumber(creature.amount)} TINC
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeaCreatures;