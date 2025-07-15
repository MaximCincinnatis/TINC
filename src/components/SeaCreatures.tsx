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
        <svg width="40" height="40" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 5v90M50 5l-8 15h16l-8-15z"/>
          <path d="M25 15l8 8M75 15l-8 8"/>
          <path d="M15 25l8 8M85 25l-8 8"/>
          <path d="M20 35l8 8M80 35l-8 8"/>
          <path d="M40 85h20M35 90h30"/>
          <circle cx="50" cy="30" r="3"/>
          <path d="M46 45c-8 0-15 3-20 8M54 45c8 0 15 3 20 8"/>
          <path d="M30 60c5-5 12-8 20-8M70 60c-5-5-12-8-20-8"/>
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
          <path d="M10 50c0-15 8-25 20-28 3-1 6-2 10-2 8 0 15 3 20 8 3 3 5 7 5 12 0 8-3 15-8 20-3 3-7 5-12 5-3 0-6-1-10-2-12-3-25-8-25-25z"/>
          <circle cx="25" cy="42" r="2"/>
          <path d="M45 35c8-3 15 0 20 8"/>
          <path d="M50 65c6 3 12 3 18 0"/>
          <path d="M65 50c8 0 15-3 20-8l8 3c-2 8-8 15-15 18-5 2-10 2-15 0"/>
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
          <path d="M5 50c0-8 3-12 8-15l15-5c8-3 15-3 23 0l12 5c5 3 8 7 8 15 0 3-2 6-5 8l-8 3c-3 1-6 1-9-1l-8-3c-3-2-6-2-9 1l-8 3c-3 2-6 2-9 1l-8-3c-3-2-5-5-5-8z"/>
          <circle cx="78" cy="42" r="2"/>
          <path d="M50 30l-12-8M50 30l12-8"/>
          <path d="M30 70l-8 12M70 70l8 12"/>
          <path d="M50 35l0-5M50 75l0 5"/>
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
          <path d="M15 50c0-12 8-20 20-24 3-1 6-2 10-2 10 0 18 4 24 12l6 10c2 4 2 8 0 12l-6 10c-6 8-14 12-24 12-4 0-7-1-10-2-12-4-20-12-20-24z"/>
          <circle cx="35" cy="42" r="2"/>
          <path d="M60 32c8-4 16 0 20 8"/>
          <path d="M64 64c8 4 16 0 20-8"/>
          <path d="M48 24c4-4 8-8 12-8M48 76c4 4 8 8 12 8"/>
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
          <ellipse cx="50" cy="30" rx="20" ry="12"/>
          <circle cx="42" cy="26" r="2"/>
          <circle cx="58" cy="26" r="2"/>
          <path d="M30 40v28l4 16M36 40v32l4 16M42 40v36l4 16M50 40v36l-4 16M58 40v32l-4 16M64 40v28l-4 16M70 40v24l-4 16"/>
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
          <path d="M15 50c0-8 4-12 8-16 4-3 12-6 20-7 4-1 8-1 12-1 4 0 8 0 12 1 4 1 8 3 8 7v32c0 4-4 6-8 7-4 1-8 1-12 1-4 0-8 0-12-1-8-1-16-4-20-7-4-4-8-8-8-16z"/>
          <circle cx="28" cy="40" r="2"/>
          <circle cx="28" cy="56" r="2"/>
          <path d="M60 32l8-4M60 40l12-4M60 56l12 4M60 64l8 4"/>
          <path d="M16 36l-8-4M16 44l-8 0M16 52l-8 0M16 60l-8 4"/>
          <path d="M68 36c4-4 8-4 12 0M68 60c4 4 8 4 12 0"/>
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