import React from 'react';
import { BurnData } from '../types/BurnData';

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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2v20M12 2l-2 4h4l-2-4z"/>
          <path d="M7 6l2 2M17 6l-2 2"/>
          <path d="M5 8l2 2M19 8l-2 2"/>
          <path d="M10 18h4M9 20h6"/>
        </svg>
      ),
      description: 'Ocean God',
      rank: 1
    },
    {
      name: 'Whale',
      percentage: 1,
      amount: totalSupply * 0.01,
      color: '#4169E1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 12c0-3 2-5.5 5-6.5 1-.3 2-.5 3-.5s2 .2 3 .5c3 1 5 3.5 5 6.5 0 1.5-.5 3-1.5 4.2l-1.5 1.8c-1 1-2.5 1-3.5 1s-2.5 0-3.5-1l-1.5-1.8C2.5 15 2 13.5 2 12z"/>
          <circle cx="8" cy="10" r="1"/>
          <path d="M16 14c1 0 2-1 2-2s-1-2-2-2"/>
          <path d="M20 10c1 0 2 1 2 2s-1 2-2 2"/>
        </svg>
      ),
      description: 'Massive Holder',
      rank: 2
    },
    {
      name: 'Shark',
      percentage: 0.1,
      amount: totalSupply * 0.001,
      color: '#696969',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 12c0-2 1-4 3-5l5-2c2-1 4-1 6 0l5 2c2 1 3 3 3 5 0 1-1 2-2 2.5l-3 1.5c-1 .5-2.5 .5-3.5 0L12 15l-3.5 1c-1 .5-2.5 .5-3.5 0L2 14.5C1 14 0 13 0 12"/>
          <circle cx="18" cy="9" r="1"/>
          <path d="M12 8l-6-4M12 8l6-4"/>
          <path d="M8 16l-4 4M16 16l4 4"/>
        </svg>
      ),
      description: 'Apex Predator',
      rank: 3
    },
    {
      name: 'Dolphin',
      percentage: 0.01,
      amount: totalSupply * 0.0001,
      color: '#00CED1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12c0-3 2-5 5-6 1-.3 2-.5 3-.5 2 0 4 1 5 3l2 3c1 1 1 3 0 4l-2 3c-1 2-3 3-5 3-1 0-2-.2-3-.5-3-1-5-3-5-6z"/>
          <circle cx="9" cy="10" r="1"/>
          <path d="M15 8c2-1 4 0 5 2"/>
          <path d="M16 16c2 1 4 0 5-2"/>
          <path d="M12 6l2-2M12 18l2 2"/>
        </svg>
      ),
      description: 'Smart Swimmer',
      rank: 4
    },
    {
      name: 'Squid',
      percentage: 0.001,
      amount: totalSupply * 0.00001,
      color: '#8B4513',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="8" rx="6" ry="3"/>
          <circle cx="10" cy="7" r="0.5"/>
          <circle cx="14" cy="7" r="0.5"/>
          <path d="M6 10v6l1 3M8 10v7l1 3M10 10v8l1 3M12 10v8l-1 3M14 10v8l-1 3M16 10v7l-1 3M18 10v6l-1 3"/>
        </svg>
      ),
      description: 'Deep Sea Dweller',
      rank: 5
    },
    {
      name: 'Shrimp',
      percentage: 0.0001,
      amount: totalSupply * 0.000001,
      color: '#FF69B4',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 12c0-2 1-4 3-5l8-2c1 0 2 1 2 2v10c0 1-1 2-2 2l-8-2c-2-1-3-3-3-5z"/>
          <circle cx="7" cy="10" r="0.5"/>
          <circle cx="7" cy="14" r="0.5"/>
          <path d="M12 8l2-1M12 10l3-1M12 14l3 1M12 16l2 1"/>
          <path d="M4 9l-2-1M4 11l-2 0M4 13l-2 0M4 15l-2 1"/>
        </svg>
      ),
      description: 'Small but Mighty',
      rank: 6
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
            <div className="creature-rank">#{creature.rank}</div>
            
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
            
            <div className="creature-stats">
              <div className="creature-percentage">
                {creature.percentage}% of supply
              </div>
              <div className="creature-amount">
                {formatNumber(creature.amount)} TINC
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeaCreatures;