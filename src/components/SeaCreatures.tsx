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
          <path d="M12 2v20"/>
          <path d="M12 2l-3 6h6l-3-6z"/>
          <path d="M6 6l3 3M18 6l-3 3"/>
          <path d="M4 8l3 3M20 8l-3 3"/>
          <circle cx="12" cy="22" r="1"/>
        </svg>
      ),
      description: 'Ocean God'
    },
    {
      name: 'Whale',
      percentage: 1,
      amount: totalSupply * 0.01,
      color: '#4169E1',
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 14c0-4 3-7 7-7s7 3 7 7c0 2-.7 3.8-2 5.2l-2 2.3c-1.5 1.5-3.5 1.5-5 0l-2-2.3c-1.3-1.4-2-3.2-2-5.2z"/>
          <circle cx="7" cy="12" r="1"/>
          <path d="M15 16c2 0 4-1 5-3"/>
          <path d="M16 9c2-1 4 0 5 2"/>
          <path d="M17 18c1.5 1 3.5 1 5 0"/>
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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 12c0-2 2-4 4-5l6-2c2-1 4-1 6 0l4 2c2 1 2 3 0 4l-4 2c-2 1-4 1-6 0l-6-2c-2-1-4-3-4-5z"/>
          <circle cx="18" cy="9" r="1"/>
          <path d="M12 7l-4-3M12 7l4-3"/>
          <path d="M8 17l-3 3M16 17l3 3"/>
          <path d="M12 6v2M12 18v2"/>
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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12c0-3 2-5 5-6 1-.3 2-.5 3-.5 2 0 4 1 5 3l2 3c1 1 1 3 0 4l-2 3c-1 2-3 3-5 3-1 0-2-.2-3-.5-3-1-5-3-5-6z"/>
          <circle cx="9" cy="10" r="1"/>
          <path d="M15 8c2-1 4 0 5 2"/>
          <path d="M16 16c2 1 4 0 5-2"/>
          <path d="M12 6c1-1 2-2 3-2M12 18c1 1 2 2 3 2"/>
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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="8" rx="6" ry="3"/>
          <circle cx="10" cy="7" r="0.5"/>
          <circle cx="14" cy="7" r="0.5"/>
          <path d="M6 10v6l1 4M8 10v7l1 4M10 10v8l1 4M12 10v8l-1 4M14 10v8l-1 4M16 10v7l-1 4M18 10v6l-1 4"/>
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
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 12c0-2 1-4 3-5 2-1 6-2 8-2 1 0 2 1 2 2v10c0 1-1 2-2 2-2 0-6-1-8-2-2-1-3-3-3-5z"/>
          <circle cx="7" cy="10" r="0.5"/>
          <circle cx="7" cy="14" r="0.5"/>
          <path d="M12 8l3-1M12 10l4-1M12 14l4 1M12 16l3 1"/>
          <path d="M4 9l-2-1M4 11l-2 0M4 13l-2 0M4 15l-2 1"/>
          <path d="M16 9c1-1 2-1 3 0M16 15c1 1 2 1 3 0"/>
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