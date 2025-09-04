#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Block Gap Issue #2\n');
console.log('=' . repeat(60));

// Load the current burn data
const burnDataPath = path.join(__dirname, 'data/burn-data.json');
const burnData = JSON.parse(fs.readFileSync(burnDataPath, 'utf8'));

// Load gap-resistant manager data
const processedRangesPath = path.join(__dirname, 'data/processed-ranges.json');
let processedRanges = [];
if (fs.existsSync(processedRangesPath)) {
  processedRanges = JSON.parse(fs.readFileSync(processedRangesPath, 'utf8'));
}

console.log('📊 Current Tracking Status:');
console.log(`  lastProcessedBlock (burn-data.json): ${burnData.lastProcessedBlock || 'Not set'}`);
console.log(`  Processed ranges count: ${processedRanges.length}`);

if (processedRanges.length > 0) {
  const lastRange = processedRanges[processedRanges.length - 1];
  console.log(`  Last range end block: ${lastRange.endBlock}`);
  console.log(`  Gap size: ${(burnData.lastProcessedBlock || 0) - lastRange.endBlock} blocks`);
}

console.log('\n📦 Analyzing actual burn transactions in data:');

// Extract all block numbers from transactions
const allBlockNumbers = [];
let minBlock = Infinity;
let maxBlock = 0;

burnData.dailyBurns.forEach(day => {
  day.transactions.forEach(tx => {
    if (tx.blockNumber) {
      allBlockNumbers.push(tx.blockNumber);
      minBlock = Math.min(minBlock, tx.blockNumber);
      maxBlock = Math.max(maxBlock, tx.blockNumber);
    }
  });
});

console.log(`  Total transactions with block numbers: ${allBlockNumbers.length}`);
console.log(`  Earliest block in data: ${minBlock}`);
console.log(`  Latest block in data: ${maxBlock}`);
console.log(`  Block range span: ${maxBlock - minBlock} blocks`);

// Check for gaps in the actual data
console.log('\n🔍 Checking for gaps in block coverage:');

// Sort blocks and look for gaps
allBlockNumbers.sort((a, b) => a - b);

const gaps = [];
for (let i = 1; i < allBlockNumbers.length; i++) {
  const gap = allBlockNumbers[i] - allBlockNumbers[i-1];
  if (gap > 10000) { // Only report significant gaps (>10k blocks)
    gaps.push({
      from: allBlockNumbers[i-1],
      to: allBlockNumbers[i],
      size: gap
    });
  }
}

if (gaps.length === 0) {
  console.log('  ✅ No significant gaps found in transaction data');
} else {
  console.log(`  ⚠️ Found ${gaps.length} significant gaps:`);
  gaps.forEach(gap => {
    console.log(`    Blocks ${gap.from} → ${gap.to}: ${gap.size} blocks`);
  });
}

// Check the specific disputed range
console.log('\n🎯 Checking the disputed block range:');
const disputedStart = 23244399;
const disputedEnd = 23289865;

const transactionsInDisputed = allBlockNumbers.filter(
  block => block > disputedStart && block <= disputedEnd
);

console.log(`  Range: ${disputedStart} → ${disputedEnd}`);
console.log(`  Transactions found in this range: ${transactionsInDisputed.length}`);

if (transactionsInDisputed.length > 0) {
  console.log('  First few blocks with transactions:');
  transactionsInDisputed.slice(0, 5).forEach(block => {
    console.log(`    - Block ${block}`);
  });
}

// Check if lastProcessedBlock makes sense
console.log('\n📈 Validating lastProcessedBlock:');
if (burnData.lastProcessedBlock) {
  const lastBlock = burnData.lastProcessedBlock;
  
  if (lastBlock < maxBlock) {
    console.log(`  ❌ ERROR: lastProcessedBlock (${lastBlock}) < max transaction block (${maxBlock})`);
    console.log('     This means we have transactions from blocks we claim not to have processed!');
  } else if (lastBlock > maxBlock + 10000) {
    console.log(`  ⚠️ WARNING: lastProcessedBlock (${lastBlock}) is far ahead of latest transaction (${maxBlock})`);
    console.log('     This could mean we checked many blocks with no burns');
  } else {
    console.log(`  ✅ lastProcessedBlock (${lastBlock}) seems reasonable`);
    console.log(`     It's ${lastBlock - maxBlock} blocks ahead of latest transaction`);
  }
}

// Summary
console.log('\n' + '=' . repeat(60));
console.log('📋 SUMMARY:');
console.log('=' . repeat(60));

const hasRealGap = transactionsInDisputed.length === 0 && maxBlock < disputedStart;

if (hasRealGap) {
  console.log('❌ REAL GAP DETECTED:');
  console.log('  The 45,466 block gap appears to be real.');
  console.log('  No transactions found in the disputed range.');
  console.log('  Action needed: Backfill missing blocks');
} else if (transactionsInDisputed.length > 0) {
  console.log('✅ NO REAL GAP - Just tracking mismatch:');
  console.log('  Found transactions in the "missing" block range.');
  console.log('  The gap-resistant manager just needs to be updated.');
  console.log('  Action needed: Synchronize tracking systems');
} else {
  console.log('🤔 INCONCLUSIVE:');
  console.log('  No burns in disputed range, but this could be normal');
  console.log('  (blocks with no TINC burns are common)');
  console.log('  Action needed: Verify with blockchain directly');
}

console.log('\n📊 Block Coverage Stats:');
console.log(`  Data covers blocks: ${minBlock} to ${maxBlock}`);
console.log(`  lastProcessedBlock claims: ${burnData.lastProcessedBlock || 'not set'}`);
console.log(`  Gap manager shows: up to ${processedRanges.length > 0 ? processedRanges[processedRanges.length - 1].endBlock : 'no ranges'}`);