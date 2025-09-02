const fs = require('fs');
const path = require('path');

// Load current burn data
const burnData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/burn-data.json'), 'utf8'));

console.log('TINC Burn Data Quick Audit');
console.log('===========================\n');

// Summary statistics
console.log('📊 Data Overview:');
console.log(`Date Range: ${burnData.startDate} to ${burnData.endDate}`);
console.log(`Total Burned: ${burnData.totalBurned.toFixed(2)} TINC`);
console.log(`Days with burns: ${burnData.dailyBurns.length}`);
console.log(`Total transactions: ${burnData.dailyBurns.reduce((sum, d) => sum + d.transactionCount, 0)}`);
console.log(`Last processed block: ${burnData.lastProcessedBlock || 'Not tracked'}\n`);

// Check for gaps in dates
console.log('📅 Date Coverage Analysis:');
const dates = burnData.dailyBurns.map(d => d.date).sort();
const startDate = new Date(dates[0]);
const endDate = new Date(dates[dates.length - 1]);
const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

if (daysDiff !== dates.length) {
  console.log(`⚠️ WARNING: Expected ${daysDiff} days but found ${dates.length} days`);
  console.log('Missing dates might indicate gaps in data\n');
} else {
  console.log(`✅ All ${daysDiff} days accounted for\n`);
}

// Analyze burn patterns
console.log('🔥 Burn Pattern Analysis:');
const avgBurn = burnData.totalBurned / burnData.dailyBurns.length;
const maxDay = burnData.dailyBurns.reduce((max, d) => d.amountTinc > max.amountTinc ? d : max);
const minDay = burnData.dailyBurns.reduce((min, d) => d.amountTinc < min.amountTinc ? d : min);

console.log(`Average daily burn: ${avgBurn.toFixed(2)} TINC`);
console.log(`Maximum burn day: ${maxDay.date} with ${maxDay.amountTinc.toFixed(2)} TINC`);
console.log(`Minimum burn day: ${minDay.date} with ${minDay.amountTinc.toFixed(2)} TINC\n`);

// Check for duplicate transactions
console.log('🔍 Duplicate Transaction Check:');
const allTxHashes = [];
let duplicates = 0;

burnData.dailyBurns.forEach(day => {
  day.transactions.forEach(tx => {
    if (allTxHashes.includes(tx.hash)) {
      duplicates++;
      console.log(`  Duplicate found: ${tx.hash}`);
    }
    allTxHashes.push(tx.hash);
  });
});

if (duplicates === 0) {
  console.log(`✅ No duplicate transactions found (${allTxHashes.length} unique transactions)\n`);
} else {
  console.log(`⚠️ Found ${duplicates} duplicate transactions\n`);
}

// Check transaction sources
console.log('📍 Burn Sources Analysis:');
const burnSources = {};
burnData.dailyBurns.forEach(day => {
  day.transactions.forEach(tx => {
    const from = tx.from || 'unknown';
    burnSources[from] = (burnSources[from] || 0) + 1;
  });
});

Object.entries(burnSources).forEach(([address, count]) => {
  console.log(`  ${address}: ${count} burns`);
});

// Recent activity check
console.log('\n📈 Recent Activity (Last 7 days):');
const last7Days = burnData.dailyBurns.slice(-7);
last7Days.forEach(day => {
  console.log(`  ${day.date}: ${day.amountTinc.toFixed(2)} TINC in ${day.transactionCount} transactions`);
});

// Block coverage estimate
console.log('\n🔗 Block Coverage Estimate:');
if (burnData.lastProcessedBlock) {
  console.log(`Last processed block: ${burnData.lastProcessedBlock}`);
  
  // Estimate based on average block time
  const blocksPerDay = (24 * 60 * 60) / 12; // ~7200 blocks per day
  const expectedBlocks = daysDiff * blocksPerDay;
  console.log(`Expected blocks to scan for ${daysDiff} days: ~${Math.round(expectedBlocks)}`);
} else {
  console.log('⚠️ Block tracking not implemented in current data');
}

// Data integrity score
console.log('\n📊 Data Integrity Score:');
let score = 100;
const issues = [];

if (daysDiff !== dates.length) {
  score -= 20;
  issues.push('Missing dates in coverage');
}

if (duplicates > 0) {
  score -= 30;
  issues.push(`${duplicates} duplicate transactions`);
}

if (!burnData.lastProcessedBlock) {
  score -= 10;
  issues.push('No block tracking');
}

if (Object.keys(burnSources).length === 1) {
  score -= 15;
  issues.push('Only tracking burns from single source');
}

console.log(`Score: ${score}/100`);
if (issues.length > 0) {
  console.log('Issues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('✅ No issues detected');
}

console.log('\n' + '='.repeat(50));
console.log('Audit complete. For detailed verification against');
console.log('blockchain, run: node scripts/verify-burns.js');