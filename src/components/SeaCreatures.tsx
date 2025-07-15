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
          
          {/* Trident shaft */}
          <path d="M50 10v85" stroke="url(#poseidonGradient)" strokeWidth="3" fill="none"/>
          
          {/* Trident prongs */}
          <path d="M40 8l8 12M50 8v12M60 8l-8 12" stroke="url(#poseidonGradient)" strokeWidth="2.5" fill="none"/>
          <path d="M38 15l4 8M50 15v8M62 15l-4 8" stroke="url(#poseidonGradient)" strokeWidth="2" fill="none"/>
          
          {/* Trident base detail */}
          <circle cx="50" cy="20" r="2" fill="url(#poseidonGradient)"/>
          
          {/* Flowing beard */}
          <path d="M42 35c-2 5-4 12-3 18 1 6 4 8 6 6 2-2 1-8 0-12M50 35c0 8-1 15 0 20 1 5 3 7 4 5 1-2 0-10-1-15M58 35c2 5 4 12 3 18-1 6-4 8-6 6-2-2-1-8 0-12" fill="url(#poseidonGradient)"/>
          
          {/* Hair/crown details */}
          <path d="M35 25c5-3 10-5 15-5s10 2 15 5c-2 3-5 5-8 6-3 1-6 1-9 0-3-1-6-3-8-6M45 28c2-2 5-3 8-3s6 1 8 3" stroke="url(#poseidonGradient)" strokeWidth="1.5" fill="none"/>
          
          {/* Muscular shoulders */}
          <path d="M35 50c8-5 15-5 23 0 8 5 12 15 8 25-4 10-12 15-20 15-8 0-16-5-20-15-4-10 1-20 9-25z" fill="url(#poseidonGradient)" opacity="0.8"/>
          
          {/* Divine aura lines */}
          <path d="M20 20l5 5M80 20l-5 5M15 35l7 3M85 35l-7 3M25 55l6 2M75 55l-6 2" stroke="url(#poseidonGradient)" strokeWidth="1.5" opacity="0.6"/>
          
          {/* Trident handle grip */}
          <path d="M48 85h4M47 80h6M46 75h8" stroke="url(#poseidonGradient)" strokeWidth="2"/>
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
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          
          {/* Main whale body */}
          <path d="M15 50c0-18 12-28 25-30 8-1 15 1 22 5 6 3 10 8 12 15 2 7 1 14-2 20-3 6-8 10-15 12-4 1-8 1-12 0-8-2-16-6-22-12-6-6-8-10-8-10z" fill="url(#whaleGradient)"/>
          
          {/* Whale head detail */}
          <path d="M12 45c2-8 6-15 12-18 4-2 8-3 12-2 3 1 6 3 8 6" stroke="url(#whaleGradient)" strokeWidth="1.5" fill="none" opacity="0.8"/>
          
          {/* Eye */}
          <circle cx="28" cy="42" r="2.5" fill="currentColor"/>
          <circle cx="29" cy="41" r="1" fill="rgba(255,255,255,0.3)"/>
          
          {/* Mouth line */}
          <path d="M18 52c8-2 15-1 20 2" stroke="url(#whaleGradient)" strokeWidth="2" fill="none"/>
          
          {/* Dorsal fin */}
          <path d="M45 35c3-8 8-12 15-10 5 2 8 8 6 15-2 7-8 10-15 8-7-2-9-8-6-13z" fill="url(#whaleGradient)" opacity="0.9"/>
          
          {/* Pectoral fin */}
          <path d="M35 60c5-3 12-4 18-2 6 2 10 6 8 12-2 6-8 8-15 6-7-2-13-8-11-16z" fill="url(#whaleGradient)" opacity="0.8"/>
          
          {/* Tail fluke */}
          <path d="M70 45c8-5 15-6 22-3 7 3 10 9 8 16-2 7-8 10-16 8-8-2-14-8-14-15 0-2 0-4 0-6z" fill="url(#whaleGradient)"/>
          <path d="M70 55c8 5 15 6 22 3 7-3 10-9 8-16-2-7-8-10-16-8-8 2-14 8-14 15 0 2 0 4 0 6z" fill="url(#whaleGradient)"/>
          
          {/* Tail fluke detail */}
          <path d="M75 50c6 0 12-2 16-5M75 50c6 0 12 2 16 5" stroke="url(#whaleGradient)" strokeWidth="1.5" fill="none"/>
          
          {/* Baleen/mouth detail */}
          <path d="M20 50l2 4M24 50l2 4M28 50l2 4M32 50l2 4" stroke="url(#whaleGradient)" strokeWidth="1" opacity="0.7"/>
          
          {/* Body shadow/depth */}
          <path d="M20 55c15-3 25-3 35 0 8 2 12 5 10 8-2 3-8 3-18 1-10-2-20-5-27-9z" fill="url(#whaleGradient)" opacity="0.4"/>
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
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"/>
            </linearGradient>
          </defs>
          
          {/* Main shark body */}
          <path d="M10 50c0-12 8-20 18-22 8-2 16-1 24 2 12 4 20 12 24 22 4 10 2 18-4 24-6 6-16 8-26 6-15-3-28-12-32-24-2-4-4-6-4-8z" fill="url(#sharkGradient)"/>
          
          {/* Shark head/snout */}
          <path d="M8 48c2-8 6-14 12-18 4-3 8-4 12-4 3 0 6 1 8 3 2 2 3 5 2 8-1 3-4 5-8 6-4 1-8 0-12-2-4-2-8-5-10-8-2-3-2-5-4-5z" fill="url(#sharkGradient)" opacity="0.9"/>
          
          {/* Eye */}
          <circle cx="25" cy="42" r="2.5" fill="currentColor"/>
          <circle cx="26" cy="41" r="1" fill="rgba(255,255,255,0.4)"/>
          
          {/* Gill slits */}
          <path d="M35 38l3 6M38 40l3 6M41 42l3 6M44 44l3 6M47 46l3 6" stroke="url(#sharkGradient)" strokeWidth="1.5" opacity="0.8"/>
          
          {/* Dorsal fin */}
          <path d="M50 25c5-15 12-18 20-15 8 3 10 12 8 20-2 8-8 12-16 10-8-2-14-10-12-15z" fill="url(#sharkGradient)"/>
          
          {/* Pectoral fins */}
          <path d="M40 60c8-5 15-6 22-3 7 3 10 9 8 16-2 7-8 10-16 8-8-2-14-8-14-15 0-2 0-4 0-6z" fill="url(#sharkGradient)" opacity="0.8"/>
          <path d="M38 65c6-3 12-4 18-2 6 2 10 6 8 12-2 6-8 8-15 6-7-2-13-8-11-16z" fill="url(#sharkGradient)" opacity="0.6"/>
          
          {/* Tail fin */}
          <path d="M75 35c10-8 18-10 25-5 7 5 8 15 3 22-5 7-15 8-22 3-7-5-8-15-3-22 0-1 0-2 0-3z" fill="url(#sharkGradient)"/>
          <path d="M75 65c10 8 18 10 25 5 7-5 8-15 3-22-5-7-15-8-22-3-7 5-8 15-3 22 0 1 0 2 0 3z" fill="url(#sharkGradient)"/>
          
          {/* Shark teeth/jaw line */}
          <path d="M18 48l2 3 2-3 2 3 2-3 2 3 2-3" stroke="url(#sharkGradient)" strokeWidth="1.5" fill="none"/>
          
          {/* Body stripes for detail */}
          <path d="M45 40c8-2 15-1 20 2M45 50c8-2 15-1 20 2M45 60c8-2 15-1 20 2" stroke="url(#sharkGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M15 58c20-3 35-3 50 0 12 2 18 5 15 8-3 3-12 3-25 1-13-2-28-5-40-9z" fill="url(#sharkGradient)" opacity="0.3"/>
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
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          
          {/* Main dolphin body */}
          <path d="M12 50c0-15 8-22 18-26 8-3 16-3 24-1 12 3 20 10 24 18 4 8 4 16 0 24-4 8-12 14-22 16-6 1-12 0-18-2-10-3-18-10-22-18-2-4-4-7-4-11z" fill="url(#dolphinGradient)"/>
          
          {/* Dolphin beak/rostrum */}
          <path d="M8 48c2-6 5-10 10-12 4-2 8-2 12-1 3 1 6 3 8 6 2 3 2 6 0 9-2 3-6 4-10 3-4-1-8-3-12-5-4-2-6-4-8-6z" fill="url(#dolphinGradient)" opacity="0.9"/>
          
          {/* Melon (forehead) */}
          <path d="M25 35c8-5 15-6 22-4 7 2 12 7 12 14 0 7-5 12-12 14-7 2-14 1-22-4z" fill="url(#dolphinGradient)" opacity="0.8"/>
          
          {/* Eye */}
          <circle cx="32" cy="42" r="3" fill="currentColor"/>
          <circle cx="33" cy="41" r="1.2" fill="rgba(255,255,255,0.4)"/>
          
          {/* Blowhole */}
          <ellipse cx="40" cy="32" rx="2" ry="1" fill="currentColor" opacity="0.7"/>
          
          {/* Dorsal fin */}
          <path d="M50 25c6-12 14-15 22-10 8 5 10 15 5 22-5 7-15 8-22 3-7-5-8-12-5-15z" fill="url(#dolphinGradient)"/>
          
          {/* Pectoral fin */}
          <path d="M35 60c8-4 15-5 22-2 7 3 11 9 8 16-3 7-10 9-18 6-8-3-14-10-12-20z" fill="url(#dolphinGradient)" opacity="0.8"/>
          
          {/* Tail fluke */}
          <path d="M75 38c8-6 16-8 24-4 8 4 10 12 6 20-4 8-12 10-20 6-8-4-10-12-6-20 0-1 0-2-4-2z" fill="url(#dolphinGradient)"/>
          <path d="M75 62c8 6 16 8 24 4 8-4 10-12 6-20-4-8-12-10-20-6-8 4-10 12-6 20 0 1 0 2-4 2z" fill="url(#dolphinGradient)"/>
          
          {/* Tail fluke detail */}
          <path d="M80 50c8-3 15-4 20-2M80 50c8 3 15 4 20 2" stroke="url(#dolphinGradient)" strokeWidth="1.5" fill="none"/>
          
          {/* Smile line */}
          <path d="M15 52c8-2 15-1 20 2 3 2 5 4 4 6" stroke="url(#dolphinGradient)" strokeWidth="1.5" fill="none" opacity="0.8"/>
          
          {/* Body curve details */}
          <path d="M40 45c10-2 18-1 25 2M40 55c10-2 18-1 25 2" stroke="url(#dolphinGradient)" strokeWidth="1" opacity="0.5"/>
          
          {/* Shadow under body */}
          <path d="M20 58c15-3 28-3 40 0 10 2 15 5 12 8-3 3-10 3-22 1-12-2-25-5-30-9z" fill="url(#dolphinGradient)" opacity="0.3"/>
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
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"/>
            </linearGradient>
          </defs>
          
          {/* Main squid mantle/body */}
          <path d="M35 15c8-5 15-5 22 0 7 5 10 12 8 20-2 8-8 14-15 16-7 2-14 2-20 0-6-2-10-8-12-16-2-8 1-15 8-20 3-2 6-3 9-3z" fill="url(#squidGradient)"/>
          
          {/* Squid head detail */}
          <path d="M40 20c5-3 10-3 15 0 5 3 8 8 6 13-2 5-8 7-13 5-5-2-8-8-6-13 0-2 1-3 2-5z" fill="url(#squidGradient)" opacity="0.8"/>
          
          {/* Eyes */}
          <circle cx="42" cy="26" r="3" fill="currentColor"/>
          <circle cx="58" cy="26" r="3" fill="currentColor"/>
          <circle cx="43" cy="25" r="1.2" fill="rgba(255,255,255,0.3)"/>
          <circle cx="59" cy="25" r="1.2" fill="rgba(255,255,255,0.3)"/>
          
          {/* Tentacles - 8 total with realistic curves */}
          <path d="M32 40c-2 8-4 16-2 24 2 8 6 12 8 16 2 4 2 6 0 8-2 2-6 0-8-4-2-4-2-10-1-16 1-6 3-12 3-18" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M38 40c-1 10-2 20 0 28 2 8 6 10 8 14 2 4 2 6 0 8-2 2-6 0-8-4-2-4-2-8-1-14 1-6 1-16 1-22" fill="url(#squidGradient)" opacity="0.8"/>
          <path d="M44 40c0 12-1 22 1 30 2 8 6 8 8 12 2 4 2 6 0 8-2 2-6 0-8-4-2-4-2-8-1-14 1-6 0-18 0-24" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M50 40c0 12 0 24 2 32 2 8 6 6 8 10 2 4 2 6 0 8-2 2-6 0-8-4-2-4-2-8-1-14 1-6 0-18-1-24" fill="url(#squidGradient)"/>
          <path d="M56 40c1 12 2 22 0 30-2 8-6 8-8 12-2 4-2 6 0 8 2 2 6 0 8-4 2-4 2-8 1-14-1-6 0-18 0-24" fill="url(#squidGradient)" opacity="0.9"/>
          <path d="M62 40c1 10 2 20 0 28-2 8-6 10-8 14-2 4-2 6 0 8 2 2 6 0 8-4 2-4 2-8 1-14-1-6-1-16-1-22" fill="url(#squidGradient)" opacity="0.8"/>
          <path d="M68 40c2 8 4 16 2 24-2 8-6 12-8 16-2 4-2 6 0 8 2 2 6 0 8-4 2-4 2-10 1-16-1-6-3-12-3-18" fill="url(#squidGradient)" opacity="0.9"/>
          
          {/* Tentacle suckers */}
          <circle cx="30" cy="55" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="28" cy="70" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="36" cy="60" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="34" cy="75" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="42" cy="65" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="40" cy="80" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="58" cy="65" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="60" cy="80" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="64" cy="60" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="66" cy="75" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="70" cy="55" r="1" fill="currentColor" opacity="0.6"/>
          <circle cx="72" cy="70" r="1" fill="currentColor" opacity="0.6"/>
          
          {/* Mantle fins */}
          <path d="M30 25c-8 2-12 8-10 15 2 7 8 10 15 8" fill="url(#squidGradient)" opacity="0.7"/>
          <path d="M70 25c8 2 12 8 10 15-2 7-8 10-15 8" fill="url(#squidGradient)" opacity="0.7"/>
          
          {/* Body pattern */}
          <path d="M40 30c6-2 12-2 18 0M42 35c5-1 10-1 15 0" stroke="url(#squidGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Shadow under body */}
          <path d="M38 45c8-2 15-2 22 0 6 2 8 4 6 6-2 2-8 2-16 0-8-2-14-4-12-6z" fill="url(#squidGradient)" opacity="0.3"/>
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
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          
          {/* Main shrimp body - curved */}
          <path d="M20 45c0-8 6-12 12-14 8-3 16-3 24-1 8 2 14 6 18 12 4 6 4 12 2 18-2 6-6 10-12 12-4 1-8 1-12 0-8-2-16-6-20-12-4-6-6-10-6-15z" fill="url(#shrimpGradient)"/>
          
          {/* Shrimp rostrum (pointed beak) */}
          <path d="M15 48c2-4 4-6 8-7 3-1 6-1 9 0 2 1 4 2 5 4 1 2 1 4 0 6-1 2-3 3-6 3-3 0-6-1-9-2-3-1-5-2-7-4z" fill="url(#shrimpGradient)" opacity="0.9"/>
          
          {/* Segmented body sections */}
          <path d="M25 42c8-2 15-2 22 0 6 2 8 4 6 6-2 2-8 2-16 0-8-2-14-4-12-6z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M30 50c8-2 15-2 22 0 6 2 8 4 6 6-2 2-8 2-16 0-8-2-14-4-12-6z" fill="url(#shrimpGradient)" opacity="0.7"/>
          <path d="M35 58c8-2 15-2 22 0 6 2 8 4 6 6-2 2-8 2-16 0-8-2-14-4-12-6z" fill="url(#shrimpGradient)" opacity="0.6"/>
          
          {/* Eyes on stalks */}
          <circle cx="22" cy="38" r="2" fill="currentColor"/>
          <circle cx="26" cy="36" r="2" fill="currentColor"/>
          <circle cx="23" cy="37" r="0.8" fill="rgba(255,255,255,0.4)"/>
          <circle cx="27" cy="35" r="0.8" fill="rgba(255,255,255,0.4)"/>
          
          {/* Long antennae */}
          <path d="M18 40c-8-2-15-5-20-10M20 38c-8-1-15-3-20-7" stroke="url(#shrimpGradient)" strokeWidth="1.5" fill="none" opacity="0.8"/>
          <path d="M22 36c-8 0-15-1-20-4M24 34c-8 1-15 0-20-2" stroke="url(#shrimpGradient)" strokeWidth="1.2" fill="none" opacity="0.7"/>
          
          {/* Swimming legs (pleopods) */}
          <path d="M28 55l-6 8M32 57l-6 8M36 59l-6 8M40 61l-6 8M44 63l-6 8" stroke="url(#shrimpGradient)" strokeWidth="1.5" opacity="0.7"/>
          <path d="M30 52l-4 6M34 54l-4 6M38 56l-4 6M42 58l-4 6M46 60l-4 6" stroke="url(#shrimpGradient)" strokeWidth="1.2" opacity="0.6"/>
          
          {/* Walking legs */}
          <path d="M35 48l-3 10M40 50l-3 10M45 52l-3 10M50 54l-3 10M55 56l-3 10" stroke="url(#shrimpGradient)" strokeWidth="1.8" opacity="0.8"/>
          
          {/* Tail fan (uropods) */}
          <path d="M65 45c8-3 15-2 20 2 5 4 6 10 2 15-4 5-12 6-18 3-6-3-8-10-4-15 0-2 0-3 0-5z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M65 55c8 3 15 2 20-2 5-4 6-10 2-15-4-5-12-6-18-3-6 3-8 10-4 15 0 2 0 3 0 5z" fill="url(#shrimpGradient)" opacity="0.8"/>
          <path d="M70 50c8 0 15 1 20 4" stroke="url(#shrimpGradient)" strokeWidth="1.5" fill="none"/>
          
          {/* Carapace detail */}
          <path d="M32 45c5-1 10-1 15 0M34 50c5-1 10-1 15 0M36 55c5-1 10-1 15 0" stroke="url(#shrimpGradient)" strokeWidth="1" opacity="0.4"/>
          
          {/* Body curve shadow */}
          <path d="M25 60c12-3 22-3 30 0 8 3 10 6 8 8-2 2-8 2-18-1-10-3-22-5-20-7z" fill="url(#shrimpGradient)" opacity="0.3"/>
          
          {/* Curved posture line */}
          <path d="M20 50c10-2 20-2 30 0 8 2 15 4 20 8" stroke="url(#shrimpGradient)" strokeWidth="1.5" fill="none" opacity="0.5"/>
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