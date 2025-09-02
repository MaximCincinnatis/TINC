const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/comparison-report.json'), 'utf8'));
const blockchain = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/blockchain-burns.json'), 'utf8'));
const prodData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/burn-data.json'), 'utf8'));

console.log('MISSING TRANSACTIONS ROOT CAUSE ANALYSIS');
console.log('='.repeat(60));

// Analyze missing transactions by block range
const missingByBlock = {};
report.missingTransactions.forEach(tx => {
  const blockRange = Math.floor(tx.blockNumber / 1000) * 1000;
  if (!missingByBlock[blockRange]) {
    missingByBlock[blockRange] = [];
  }
  missingByBlock[blockRange].push(tx);
});

console.log('\n📊 Missing Transactions by Block Range:');
Object.entries(missingByBlock).sort((a, b) => a[0] - b[0]).forEach(([range, txs]) => {
  const start = parseInt(range);
  const end = start + 999;
  console.log(`  Blocks ${start}-${end}: ${txs.length} missing transactions`);
  console.log(`    Total: ${txs.reduce((s, t) => s + t.amount, 0).toFixed(2)} TINC`);
  txs.slice(0, 2).forEach(tx => {
    console.log(`      - Block ${tx.blockNumber}: ${tx.amount.toFixed(2)} TINC`);
  });
});

// Check block coverage
console.log('\n🔍 Block Coverage Analysis:');
console.log(`Production last processed block: ${prodData.lastProcessedBlock}`);
console.log(`Verification scan end block: ${blockchain.endBlock}`);
console.log(`Verification scan start block: ${blockchain.startBlock}`);

// Find the actual block ranges where burns occurred
const burnBlocks = blockchain.allTransactions.map(tx => tx.blockNumber);
const minBurnBlock = Math.min(...burnBlocks);
const maxBurnBlock = Math.max(...burnBlocks);
console.log(`\nActual burn block range: ${minBurnBlock} to ${maxBurnBlock}`);

// Check if missing transactions are in uncovered ranges
console.log('\n⚠️ Missing Transaction Block Analysis:');
report.missingTransactions.forEach(tx => {
  if (tx.blockNumber > prodData.lastProcessedBlock) {
    console.log(`  FUTURE: Block ${tx.blockNumber} > ${prodData.lastProcessedBlock} (not yet scanned)`);
  } else if (tx.blockNumber < minBurnBlock) {
    console.log(`  PAST: Block ${tx.blockNumber} < ${minBurnBlock} (before scan range)`);
  } else {
    console.log(`  WITHIN RANGE: Block ${tx.blockNumber} should have been captured!`);
  }
});

// Analyze patterns
console.log('\n📍 Missing Transaction Sources:');
const sources = {};
report.missingTransactions.forEach(tx => {
  sources[tx.from] = (sources[tx.from] || 0) + 1;
});
Object.entries(sources).forEach(([addr, count]) => {
  console.log(`  ${addr}: ${count} transactions`);
});

// Check incremental update windows
console.log('\n📅 Date Coverage Issues:');
const prodDates = prodData.dailyBurns.map(d => d.date);
const blockchainDates = blockchain.dailyBurns.map(d => d.date);

blockchainDates.forEach(date => {
  const prodDay = prodData.dailyBurns.find(d => d.date === date);
  const blockDay = blockchain.dailyBurns.find(d => d.date === date);
  
  if (prodDay && blockDay) {
    const diff = blockDay.totalAmount - prodDay.amountTinc;
    if (Math.abs(diff) > 1) {
      console.log(`  ${date}: Production has ${prodDay.transactionCount} txs, Blockchain has ${blockDay.transactionCount} txs`);
      console.log(`    Missing: ${(diff).toFixed(2)} TINC`);
    }
  }
});

// Hypothesis testing
console.log('\n🔬 Root Cause Hypothesis:');

// Check if it's a 30-day window issue
const oldestProdDate = new Date(prodData.dailyBurns[0].date);
const newestProdDate = new Date(prodData.dailyBurns[prodData.dailyBurns.length - 1].date);
const daysDiff = Math.ceil((newestProdDate - oldestProdDate) / (1000 * 60 * 60 * 24));

console.log(`\n1. WINDOW SHIFT ISSUE:`);
console.log(`   Production window: ${prodData.dailyBurns[0].date} to ${prodData.dailyBurns[prodData.dailyBurns.length - 1].date}`);
console.log(`   Days in window: ${daysDiff} days`);
console.log(`   Configured for: 30-day rolling window`);

// Check for block gap issue
console.log(`\n2. BLOCK GAP ISSUE:`);
const missingBlocks = report.missingTransactions.map(tx => tx.blockNumber);
const minMissing = Math.min(...missingBlocks);
const maxMissing = Math.max(...missingBlocks);
console.log(`   Missing transaction blocks: ${minMissing} to ${maxMissing}`);
console.log(`   Last processed: ${prodData.lastProcessedBlock}`);
if (minMissing < prodData.lastProcessedBlock) {
  console.log(`   ⚠️ CRITICAL: Missing blocks ${minMissing} are BEFORE last processed block!`);
  console.log(`   This suggests blocks were skipped during scanning.`);
}

// Check for incremental update issue
console.log(`\n3. INCREMENTAL UPDATE ISSUE:`);
console.log(`   Recent updates only fetch NEW blocks after lastProcessedBlock`);
console.log(`   If a block range was skipped, incremental updates won't go back`);

console.log('\n' + '='.repeat(60));
console.log('CONCLUSION: The scanner likely skipped block ranges during');
console.log('past updates and incremental updates don\'t revisit old blocks.');