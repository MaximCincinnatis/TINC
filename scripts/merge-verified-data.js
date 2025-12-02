const fs = require('fs');
const path = require('path');

console.log('🔄 MERGING OLD + VERIFIED DATA\n');

// Load both datasets
const oldData = JSON.parse(fs.readFileSync('data/burn-data.json', 'utf8'));
const newData = JSON.parse(fs.readFileSync('data/burn-data-26day-verification.json', 'utf8'));

console.log('📊 Old data: ' + oldData.dailyBurns.length + ' days (' + oldData.startDate + ' to ' + oldData.endDate + ')');
console.log('📊 New data: ' + newData.dailyBurns.length + ' days (' + newData.startDate + ' to ' + newData.endDate + ')');
console.log();

// New data starts at 2025-10-24
const verifiedStartDate = '2025-10-24';

// Split old data: keep only days BEFORE verified data
const oldDaysToKeep = oldData.dailyBurns.filter(day => day.date < verifiedStartDate);
console.log('✅ Keeping ' + oldDaysToKeep.length + ' days from old data (before ' + verifiedStartDate + ')');
console.log('✅ Using ' + newData.dailyBurns.length + ' days from verified data (from ' + verifiedStartDate + ')');

// Merge: old days + all verified days
const mergedDays = [...oldDaysToKeep, ...newData.dailyBurns].sort((a, b) => a.date.localeCompare(b.date));

console.log();
console.log('📅 Merged range: ' + mergedDays[0].date + ' to ' + mergedDays[mergedDays.length - 1].date);
console.log('📦 Total days: ' + mergedDays.length);

// Recalculate totals
const totalBurned = mergedDays.reduce((sum, day) => sum + day.amountTinc, 0);
const totalTransactions = mergedDays.reduce((sum, day) => sum + day.transactionCount, 0);
const burnPercentage = newData.totalSupply > 0 ? (totalBurned / newData.totalSupply) * 100 : 0;
const dailyEmission = 86400; // 1 TINC/sec
const isDeflationary = totalBurned > dailyEmission;

console.log();
console.log('🔥 Recalculated totals:');
console.log('   Total Burned: ' + totalBurned.toLocaleString() + ' TINC');
console.log('   Transactions: ' + totalTransactions);
console.log('   Burn %: ' + burnPercentage.toFixed(4) + '%');
console.log('   Deflationary: ' + (isDeflationary ? 'Yes' : 'No'));

// Create merged dataset
const mergedData = {
  startDate: mergedDays[0].date,
  endDate: mergedDays[mergedDays.length - 1].date,
  totalBurned,
  totalSupply: newData.totalSupply,
  burnPercentage,
  emissionPerSecond: 1,
  emissionSamplePeriod: 86400,
  isDeflationary,
  dailyBurns: mergedDays,
  fetchedAt: new Date().toISOString(),
  fromCache: true,
  lastProcessedBlock: newData.lastProcessedBlock,
  holderStats: newData.holderStats,
  mergeNote: 'First ' + oldDaysToKeep.length + ' days from old data, remaining ' + newData.dailyBurns.length + ' days verified from local node'
};

// Save merged data
const timestamp = Date.now();
const backupPath = 'data/burn-data-OLD-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
const mergedPath = 'data/burn-data.json';
const publicPath = 'public/data/burn-data.json';

// Backup old
fs.copyFileSync(mergedPath, backupPath);
console.log();
console.log('💾 Backed up old data to: ' + backupPath);

// Write merged
fs.writeFileSync(mergedPath, JSON.stringify(mergedData, null, 2));
console.log('✅ Saved merged data to: ' + mergedPath);

// Copy to public
fs.writeFileSync(publicPath, JSON.stringify(mergedData, null, 2));
console.log('✅ Copied to public folder: ' + publicPath);

console.log();
console.log('✅ MERGE COMPLETE!');
