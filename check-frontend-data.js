const d = require('./data/burn-data.json');

console.log('Frontend Data Check:');
console.log('- Daily burns:', d.dailyBurns.length);
console.log('- Total burned:', d.totalBurned.toFixed(2));
console.log('- Total supply:', d.totalSupply ? d.totalSupply.toFixed(2) : 'missing');
console.log('- Holders:', d.holderStats ? d.holderStats.totalHolders : 'missing');
console.log('- Emission rate:', d.emissionPerSecond || 'missing');
console.log('- Deflationary:', typeof d.isDeflationary !== 'undefined' ? d.isDeflationary : 'missing');
console.log('- Burn percentage:', d.burnPercentage ? d.burnPercentage.toFixed(2) + '%' : 'missing');

if (d.holderStats) {
  console.log('\nHolder categories:');
  console.log('  - Whale:', d.holderStats.whale || 0);
  console.log('  - Shark:', d.holderStats.shark || 0);
  console.log('  - Dolphin:', d.holderStats.dolphin || 0);
}