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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2 4h4l-2 2 2 4-4-2-2 4-2-4-4 2 2-4-2-2h4l2-4z"/>
          <path d="M12 16v6M8 18h8M10 20h4"/>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 14c0-4.42 3.58-8 8-8s8 3.58 8 8c0 1.5-.4 2.9-1.1 4.1L20 19l-1.5-1.5c-.8.6-1.8 1-2.9 1.3L16 20l-4-1-4 1 .4-1.2c-1.1-.3-2.1-.7-2.9-1.3L4 19l1.1-.9C4.4 16.9 4 15.5 4 14z"/>
          <circle cx="9" cy="12" r="1"/>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c-2 0-4 1-5.5 2.5L2 9l4.5-2.5C8 8 10 9 12 9s4-1 5.5-2.5L22 9l-4.5-4.5C16 3 14 2 12 2z"/>
          <path d="M12 9c-1.5 0-3 .5-4.5 1.5L4 14l3.5-2.5c1 .5 2 1 3.5 1s2.5-.5 3.5-1L18 14l-3.5-3.5C13 9.5 12.5 9 12 9z"/>
          <circle cx="15" cy="7" r="1"/>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4c-3 0-6 2-7 5 0 2 1 4 3 5l2-1c1 1 2 1 3 1s2 0 3-1l2 1c2-1 3-3 3-5-1-3-4-5-7-5z"/>
          <path d="M8 8l2 2M14 8l2 2"/>
          <circle cx="10" cy="9" r="1"/>
          <circle cx="14" cy="9" r="1"/>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="10" rx="6" ry="4"/>
          <path d="M6 12v4l1 2M8 12v5l1 2M10 12v6l1 2M12 12v6l1 2M14 12v6l-1 2M16 12v5l-1 2M18 12v4l-1 2"/>
          <circle cx="10" cy="8" r="1"/>
          <circle cx="14" cy="8" r="1"/>
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 12c0-2.2-1.8-4-4-4s-4 1.8-4 4c0 1.1.4 2.1 1.1 2.8L8 16l1.5-1.5c.8.3 1.6.5 2.5.5s1.7-.2 2.5-.5L16 16l-1.1-1.2c.7-.7 1.1-1.7 1.1-2.8z"/>
          <path d="M12 8v2M12 14v2"/>
          <circle cx="11" cy="11" r="0.5"/>
          <circle cx="13" cy="11" r="0.5"/>
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
      
      <div className="sea-creatures-grid">
        {classifications.map((creature, index) => (
          <div key={index} className="creature-card" style={{ borderColor: creature.color }}>
            <div className="creature-header">
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