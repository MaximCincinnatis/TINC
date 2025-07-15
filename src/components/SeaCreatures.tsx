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
          <defs>
            <linearGradient id="poseidonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Poseidon silhouette - powerful god figure */}
          <path d="M45 15c3-8 6-10 10-10 4 0 7 2 10 10 2 6 2 12 0 18-1 3-2 6-4 8-2 2-4 3-6 3-2 0-4-1-6-3-2-2-3-5-4-8-2-6-2-12 0-18z" fill="url(#poseidonGradient)"/>
          
          {/* Muscular torso */}
          <path d="M35 35c5-8 10-12 15-12 5 0 10 4 15 12 3 6 4 15 2 25-2 10-8 18-17 20-9 2-15-8-17-20-2-10-1-19 2-25z" fill="url(#poseidonGradient)"/>
          
          {/* Flowing beard */}
          <path d="M42 28c-3 8-4 18-2 28 2 10 6 15 8 18 2 3 2 4 0 5-2 1-4-1-6-5-2-4-4-12-4-22 0-10 2-18 4-24z" fill="url(#poseidonGradient)" opacity="0.8"/>
          <path d="M50 28c0 10-1 22 0 32 1 10 4 15 5 18 1 3 1 4 0 5-1 1-3-1-5-5-2-4-3-12-3-22 0-10 1-18 3-24z" fill="url(#poseidonGradient)" opacity="0.9"/>
          <path d="M58 28c3 8 4 18 2 28-2 10-6 15-8 18-2 3-2 4 0 5 2 1 4-1 6-5 2-4 4-12 4-22 0-10-2-18-4-24z" fill="url(#poseidonGradient)" opacity="0.8"/>
          
          {/* Trident - held in hand */}
          <path d="M25 25c-15-5-22-3-25 2-3 5 0 12 8 15 8 3 18 2 22-3 4-5 2-12-5-14z" fill="url(#poseidonGradient)"/>
          
          {/* Trident prongs */}
          <path d="M8 35c-2-8 0-12 5-15M8 35c-2 8 0 12 5 15M18 25c0-8 2-12 5-15M18 25c0 8-2 12-5 15M28 30c2-8 4-12 7-15M28 30c2 8-4 12-7 15" stroke="url(#poseidonGradient)" strokeWidth="2" fill="none"/>
          
          {/* Powerful arm holding trident */}
          <path d="M35 40c-8-8-15-12-20-10-5 2-8 8-6 15 2 7 8 12 15 10 7-2 12-8 11-15z" fill="url(#poseidonGradient)" opacity="0.8"/>
          
          {/* Divine aura */}
          <path d="M20 20c8-2 15-2 20 0M20 80c8 2 15 2 20 0M75 25c8 2 12 8 10 15M75 75c8-2 12-8 10-15" stroke="url(#poseidonGradient)" strokeWidth="1.5" opacity="0.6"/>
          
          {/* Crown/hair detail */}
          <path d="M40 18c3-3 7-5 10-5 3 0 7 2 10 5-2 2-5 3-8 3-3 0-6-1-8-3-2-2-3-3-4-3z" fill="url(#poseidonGradient)" opacity="0.9"/>
          
          {/* Shadow under figure */}
          <path d="M30 75c8-2 15-2 25 0 8 2 12 4 10 6-2 2-8 2-18 0-10-2-20-4-17-6z" fill="url(#poseidonGradient)" opacity="0.3"/>
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
          <defs>
            <linearGradient id="whaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Main whale body - classic whale silhouette */}
          <path d="M8 50c0-15 8-25 18-28 10-3 22-2 32 3 15 7 25 18 28 30 3 12 0 22-8 28-8 6-20 8-32 5-18-4-32-15-36-28-2-5-2-8-2-10z" fill="url(#whaleGradient)"/>
          
          {/* Whale head - rounded forehead */}
          <path d="M5 45c2-10 6-18 12-22 6-4 14-5 22-3 6 2 10 6 12 12 2 6 1 12-2 16-3 4-8 6-14 6-6 0-12-2-18-5-6-3-10-8-12-14z" fill="url(#whaleGradient)" opacity="0.9"/>
          
          {/* Eye - positioned correctly */}
          <circle cx="25" cy="45" r="2.5" fill="currentColor"/>
          <circle cx="26" cy="44" r="1" fill="rgba(255,255,255,0.3)"/>
          
          {/* Mouth line - characteristic whale smile */}
          <path d="M12 55c12-3 22-2 30 2" stroke="currentColor" strokeWidth="2" opacity="0.8"/>
          
          {/* Baleen pleats */}
          <path d="M15 58l1 6M18 58l1 6M21 58l1 6M24 58l1 6M27 58l1 6" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
          
          {/* Dorsal fin - small hump-like */}
          <path d="M55 35c2-12 6-15 12-12 6 3 8 12 4 18-4 6-10 8-16 6-6-2-8-8-4-12 2-2 3-4 4-6z" fill="url(#whaleGradient)" opacity="0.8"/>
          
          {/* Pectoral fin - long whale fin */}
          <path d="M30 65c8-10 16-12 24-8 8 4 12 14 8 22-4 8-14 12-22 8-8-4-12-14-8-22 0-1 0-2 0-3z" fill="url(#whaleGradient)" opacity="0.8"/>
          
          {/* Tail fluke - characteristic whale tail */}
          <path d="M75 40c10-8 18-10 26-5 8 5 10 15 4 22-6 7-16 8-24 3-8-5-10-15-4-22 0-1 0-2-2-3z" fill="url(#whaleGradient)"/>
          <path d="M75 60c10 8 18 10 26 5 8-5 10-15 4-22-6-7-16-8-24-3-8 5-10 15-4 22 0 1 0 2-2 3z" fill="url(#whaleGradient)"/>
          
          {/* Tail fluke notch */}
          <path d="M85 50c8-2 15-2 20 0" stroke="currentColor" strokeWidth="2" opacity="0.7"/>
          
          {/* Blowhole */}
          <ellipse cx="35" cy="38" rx="2" ry="1" fill="currentColor" opacity="0.7"/>
          
          {/* Body definition */}
          <path d="M25 50c20-3 35-3 50 2" stroke="url(#whaleGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M20 60c18-3 32-3 45 2 10 3 15 6 12 8-3 2-12 2-26-1-14-3-28-6-31-9z" fill="url(#whaleGradient)" opacity="0.3"/>
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
          <defs>
            <linearGradient id="sharkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Main shark body - streamlined torpedo shape */}
          <path d="M5 50c0-8 4-15 12-18 8-3 18-3 28 0 15 4 25 12 28 20 3 8 2 15-2 20-4 5-12 8-22 8-6 0-12-1-18-3-12-4-22-12-24-20-1-3-2-5-2-7z" fill="url(#sharkGradient)"/>
          
          {/* Shark snout - pointed nose */}
          <path d="M2 48c1-5 3-8 6-10 3-2 7-3 11-2 3 1 5 3 6 6 1 3 0 6-2 8-2 2-5 3-9 2-4-1-8-2-12-4z" fill="url(#sharkGradient)" opacity="0.9"/>
          
          {/* Eye - positioned correctly */}
          <circle cx="22" cy="45" r="2" fill="currentColor"/>
          <circle cx="23" cy="44" r="0.8" fill="rgba(255,255,255,0.4)"/>
          
          {/* Gill slits - 5 vertical slits */}
          <path d="M32 42l2 8M35 43l2 8M38 44l2 8M41 45l2 8M44 46l2 8" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
          
          {/* Dorsal fin - large triangular */}
          <path d="M45 30c3-18 8-22 15-18 7 4 8 16 4 22-4 6-12 8-19 4-7-4-8-12-6-16 2-2 4-4 6-6z" fill="url(#sharkGradient)"/>
          
          {/* Pectoral fins - side fins */}
          <path d="M35 58c5-8 12-10 18-6 6 4 8 12 4 18-4 6-12 8-18 4-6-4-8-12-4-18 0-1 0-2 0-3z" fill="url(#sharkGradient)" opacity="0.8"/>
          
          {/* Tail fin - characteristic shark tail */}
          <path d="M75 35c8-12 15-15 22-8 7 7 6 18-2 24-8 6-18 4-24-4-6-8-4-18 2-24 1-1 2-2 2-3z" fill="url(#sharkGradient)"/>
          <path d="M78 58c6-8 12-10 18-6 6 4 8 12 4 18-4 6-12 8-18 4-6-4-8-12-4-18 0-1 0-2 0-3z" fill="url(#sharkGradient)" opacity="0.9"/>
          
          {/* Ventral fins - bottom fins */}
          <path d="M50 62c4-6 8-8 12-5 4 3 5 8 2 12-3 4-8 5-12 2-4-3-5-8-2-12 0-1 0-2 0-3z" fill="url(#sharkGradient)" opacity="0.7"/>
          
          {/* Mouth line */}
          <path d="M8 52c6-1 12-1 16 1" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
          
          {/* Body definition line */}
          <path d="M20 50c20-2 35-2 50 2" stroke="url(#sharkGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M15 55c15-2 30-2 45 1 10 2 15 4 12 6-3 2-10 2-22 0-12-2-25-4-35-7z" fill="url(#sharkGradient)" opacity="0.3"/>
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
          <defs>
            <linearGradient id="dolphinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Main dolphin body - sleek curved silhouette */}
          <path d="M10 50c0-12 6-20 15-24 9-4 20-4 30-1 15 4 25 14 28 25 3 11 1 20-5 26-6 6-16 8-26 7-12-1-24-8-30-18-6-10-8-18-10-22-1-2-2-4-2-7z" fill="url(#dolphinGradient)"/>
          
          {/* Dolphin beak/rostrum - characteristic long snout */}
          <path d="M5 48c1-8 4-12 8-14 4-2 9-2 14-1 5 1 8 4 10 8 2 4 2 8 0 11-2 3-6 4-11 3-5-1-10-3-15-5-5-2-8-4-6-8z" fill="url(#dolphinGradient)" opacity="0.9"/>
          
          {/* Melon (forehead bulge) */}
          <path d="M22 35c6-8 12-10 18-8 6 2 10 8 10 15 0 7-4 13-10 15-6 2-12 0-18-8z" fill="url(#dolphinGradient)" opacity="0.8"/>
          
          {/* Eye - positioned correctly */}
          <circle cx="28" cy="45" r="2.5" fill="currentColor"/>
          <circle cx="29" cy="44" r="1" fill="rgba(255,255,255,0.4)"/>
          
          {/* Blowhole */}
          <ellipse cx="35" cy="38" rx="2" ry="1" fill="currentColor" opacity="0.7"/>
          
          {/* Dorsal fin - curved backwards */}
          <path d="M50 30c4-15 10-18 18-14 8 4 10 16 6 24-4 8-12 10-20 6-8-4-10-12-6-16 1-1 2-2 2-4z" fill="url(#dolphinGradient)"/>
          
          {/* Pectoral fin - long and pointed */}
          <path d="M32 62c6-12 14-15 22-10 8 5 12 16 6 24-6 8-16 10-24 5-8-5-12-16-6-24 1-2 2-3 2-5z" fill="url(#dolphinGradient)" opacity="0.8"/>
          
          {/* Tail fluke - characteristic dolphin tail */}
          <path d="M75 40c8-10 16-12 24-7 8 5 10 17 4 25-6 8-16 10-24 5-8-5-10-17-4-25 0-1 0-2 0-3z" fill="url(#dolphinGradient)"/>
          <path d="M75 60c8 10 16 12 24 7 8-5 10-17 4-25-6-8-16-10-24-5-8 5-10 17-4 25 0 1 0 2 0 3z" fill="url(#dolphinGradient)"/>
          
          {/* Tail fluke notch */}
          <path d="M83 50c8-2 15-2 20 0" stroke="currentColor" strokeWidth="2" opacity="0.7"/>
          
          {/* Smile line - characteristic dolphin smile */}
          <path d="M12 52c10-2 18-1 24 2 4 2 6 4 5 6" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
          
          {/* Body curve definition */}
          <path d="M28 50c18-2 30-2 42 2" stroke="url(#dolphinGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M22 58c16-3 28-3 40 1 10 2 15 5 12 7-3 2-10 2-22 0-12-2-25-5-30-8z" fill="url(#dolphinGradient)" opacity="0.3"/>
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
          <defs>
            <linearGradient id="squidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Main squid mantle - torpedo shaped body */}
          <path d="M35 20c6-8 12-10 18-8 6 2 10 8 12 16 2 8 1 16-2 22-3 6-8 10-14 12-6 2-12 2-18 0-6-2-10-6-12-12-2-6-2-14 0-22 2-8 6-14 12-16 2-1 4-2 4-2z" fill="url(#squidGradient)"/>
          
          {/* Squid head */}
          <path d="M40 25c4-5 8-7 12-6 4 1 7 5 8 10 1 5 0 10-3 13-3 3-7 4-12 3-5-1-8-5-8-10-1-5 0-10 3-13z" fill="url(#squidGradient)" opacity="0.8"/>
          
          {/* Large squid eyes */}
          <circle cx="42" cy="30" r="4" fill="currentColor"/>
          <circle cx="58" cy="30" r="4" fill="currentColor"/>
          <circle cx="43" cy="29" r="1.5" fill="rgba(255,255,255,0.3)"/>
          <circle cx="59" cy="29" r="1.5" fill="rgba(255,255,255,0.3)"/>
          
          {/* Tentacles - 8 flowing tentacles */}
          <path d="M30 45c-4 12-6 24-3 36 3 12 9 18 12 24 3 6 3 8 0 10-3 2-8 0-12-6-4-6-6-18-6-30 0-12 4-24 6-36 1-2 2-3 3-4z" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M36 45c-2 15-3 30 0 42 3 12 9 15 12 21 3 6 3 8 0 10-3 2-8 0-12-6-4-6-6-15-6-27 0-12 2-24 3-36 1-2 2-3 3-4z" fill="url(#squidGradient)" opacity="0.8"/>
          <path d="M42 45c0 18-2 33 2 45 4 12 9 12 12 18 3 6 3 8 0 10-3 2-8 0-12-6-4-6-6-15-6-27 0-12 0-27 0-36 0-2 2-3 4-4z" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M50 45c0 18 0 36 3 48 3 12 9 9 12 15 3 6 3 8 0 10-3 2-8 0-12-6-4-6-6-15-6-27 0-12 0-27-2-36 0-2 2-3 5-4z" fill="url(#squidGradient)"/>
          <path d="M58 45c2 18 3 33 0 45-3 12-9 12-12 18-3 6-3 8 0 10 3 2 8 0 12-6 4-6 6-15 6-27 0-12 0-27 0-36 0-2-2-3-4-4z" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M64 45c2 15 3 30 0 42-3 12-9 15-12 21-3 6-3 8 0 10 3 2 8 0 12-6 4-6 6-15 6-27 0-12-2-24-3-36-1-2-2-3-3-4z" fill="url(#squidGradient)" opacity="0.8"/>
          <path d="M70 45c4 12 6 24 3 36-3 12-9 18-12 24-3 6-3 8 0 10 3 2 8 0 12-6 4-6 6-18 6-30 0-12-4-24-6-36-1-2-2-3-3-4z" fill="url(#squidGradient)" opacity="0.9"/>
          
          {/* Tentacle suckers */}
          <circle cx="28" cy="60" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="25" cy="75" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="34" cy="65" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="31" cy="80" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="40" cy="70" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="60" cy="70" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="66" cy="65" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="69" cy="80" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="72" cy="60" r="1.5" fill="currentColor" opacity="0.6"/>
          <circle cx="75" cy="75" r="1.5" fill="currentColor" opacity="0.6"/>
          
          {/* Mantle fins */}
          <path d="M28 35c-10 3-15 12-12 20 3 8 12 12 20 8" fill="url(#squidGradient)" opacity="0.7"/>
          <path d="M72 35c10 3 15 12 12 20-3 8-12 12-20 8" fill="url(#squidGradient)" opacity="0.7"/>
          
          {/* Body pattern */}
          <path d="M40 35c6-2 12-2 18 0M42 40c5-1 10-1 15 0" stroke="url(#squidGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M38 50c10-2 18-2 26 0 8 2 12 4 10 6-2 2-10 2-20 0-10-2-18-4-16-6z" fill="url(#squidGradient)" opacity="0.3"/>
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
          <defs>
            <linearGradient id="shrimpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          
          {/* Main shrimp body - curved characteristic shape */}
          <path d="M18 45c0-10 8-18 18-20 10-2 20-1 28 3 12 6 18 16 20 26 2 10 0 18-6 24-6 6-16 8-26 7-15-2-26-12-30-24-4-12-4-16-4-16z" fill="url(#shrimpGradient)"/>
          
          {/* Shrimp rostrum (pointed beak) */}
          <path d="M12 48c2-6 5-10 10-12 5-2 10-2 15-1 4 1 7 3 8 7 1 4 0 8-3 11-3 3-8 4-13 3-5-1-10-3-15-5-5-2-8-5-6-8z" fill="url(#shrimpGradient)" opacity="0.9"/>
          
          {/* Segmented body sections - characteristic shrimp segments */}
          <path d="M22 40c10-2 18-2 26 0 8 2 10 4 8 6-2 2-10 2-20 0-10-2-16-4-14-6z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M26 48c10-2 18-2 26 0 8 2 10 4 8 6-2 2-10 2-20 0-10-2-16-4-14-6z" fill="url(#shrimpGradient)" opacity="0.7"/>
          <path d="M30 56c10-2 18-2 26 0 8 2 10 4 8 6-2 2-10 2-20 0-10-2-16-4-14-6z" fill="url(#shrimpGradient)" opacity="0.6"/>
          <path d="M34 64c10-2 18-2 26 0 8 2 10 4 8 6-2 2-10 2-20 0-10-2-16-4-14-6z" fill="url(#shrimpGradient)" opacity="0.5"/>
          
          {/* Eyes on stalks - characteristic shrimp eyes */}
          <circle cx="20" cy="38" r="3" fill="currentColor"/>
          <circle cx="24" cy="36" r="3" fill="currentColor"/>
          <circle cx="21" cy="37" r="1.2" fill="rgba(255,255,255,0.4)"/>
          <circle cx="25" cy="35" r="1.2" fill="rgba(255,255,255,0.4)"/>
          
          {/* Long antennae - extending forward */}
          <path d="M16 40c-12-3-20-8-25-15M18 38c-12-2-20-5-25-12" stroke="url(#shrimpGradient)" strokeWidth="2" fill="none" opacity="0.8"/>
          <path d="M20 36c-12-1-20-2-25-8M22 34c-12 0-20-1-25-5" stroke="url(#shrimpGradient)" strokeWidth="1.5" fill="none" opacity="0.7"/>
          
          {/* Swimming legs (pleopods) - under belly */}
          <path d="M25 58l-8 12M28 60l-8 12M32 62l-8 12M36 64l-8 12M40 66l-8 12M44 68l-8 12" stroke="url(#shrimpGradient)" strokeWidth="2" opacity="0.7"/>
          <path d="M27 55l-6 8M30 57l-6 8M34 59l-6 8M38 61l-6 8M42 63l-6 8M46 65l-6 8" stroke="url(#shrimpGradient)" strokeWidth="1.5" opacity="0.6"/>
          
          {/* Walking legs - underneath */}
          <path d="M30 50l-4 15M35 52l-4 15M40 54l-4 15M45 56l-4 15M50 58l-4 15M55 60l-4 15" stroke="url(#shrimpGradient)" strokeWidth="2.5" opacity="0.8"/>
          
          {/* Tail fan (uropods) - characteristic fan tail */}
          <path d="M65 42c12-5 20-3 25 3 5 6 6 15 0 21-6 6-16 7-25 3-9-4-12-15-6-21 2-2 4-4 6-6z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M65 58c12 5 20 3 25-3 5-6 6-15 0-21-6-6-16-7-25-3-9 4-12 15-6 21-2 2-4 4-6 6z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M75 50c12 0 20 2 25 6" stroke="currentColor" strokeWidth="2" opacity="0.7"/>
          
          {/* Carapace detail - shell segments */}
          <path d="M28 45c8-1 15-1 20 0M30 50c8-1 15-1 20 0M32 55c8-1 15-1 20 0M34 60c8-1 15-1 20 0" stroke="url(#shrimpGradient)" strokeWidth="1.5" opacity="0.4"/>
          
          {/* Body curve shadow */}
          <path d="M22 65c15-3 28-3 40 0 10 3 15 6 12 8-3 2-12 2-26-1-14-3-28-5-26-7z" fill="url(#shrimpGradient)" opacity="0.3"/>
          
          {/* Curved posture line - characteristic shrimp curve */}
          <path d="M18 50c12-3 24-3 36 0 10 3 18 6 25 12" stroke="url(#shrimpGradient)" strokeWidth="2" fill="none" opacity="0.5"/>
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