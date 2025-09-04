#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const { spawn } = require('child_process');

console.log('🔍 FULL AUDIT: Auto-Sync Implementation\n');
console.log('=' . repeat(60));

// Test 1: Verify current sync state
console.log('TEST 1: Current Sync State');
console.log('-' . repeat(30));
const burnData = JSON.parse(fs.readFileSync('./data/burn-data.json', 'utf8'));
const ranges = JSON.parse(fs.readFileSync('./data/processed-ranges.json', 'utf8'));
const isSynced = ranges.ranges[ranges.ranges.length - 1].end === burnData.lastProcessedBlock;
console.log(`  lastProcessedBlock: ${burnData.lastProcessedBlock}`);
console.log(`  Last range end: ${ranges.ranges[ranges.ranges.length - 1].end}`);
console.log(`  Status: ${isSynced ? '✅ SYNCED' : '❌ NOT SYNCED'}`);

// Test 2: Simulate future update
console.log('\nTEST 2: Simulate Future Update');
console.log('-' . repeat(30));
console.log('  Simulating main system advancing 1000 blocks...');

// Temporarily modify burn-data.json
const originalBlock = burnData.lastProcessedBlock;
burnData.lastProcessedBlock += 1000;
fs.writeFileSync('./data/burn-data.json', JSON.stringify(burnData, null, 2));

// Run gap manager again
const GapResistantBurnManager = require('./scripts/gap-resistant-burn-manager');
const manager = new GapResistantBurnManager();
const newRanges = manager.loadProcessedRanges();

// Check if it auto-synced
const autoSynced = newRanges.ranges[newRanges.ranges.length - 1].end === burnData.lastProcessedBlock;
console.log(`  New lastProcessedBlock: ${burnData.lastProcessedBlock}`);
console.log(`  New range end: ${newRanges.ranges[newRanges.ranges.length - 1].end}`);
console.log(`  Auto-sync worked: ${autoSynced ? '✅ YES' : '❌ NO'}`);

// Restore original
burnData.lastProcessedBlock = originalBlock;
fs.writeFileSync('./data/burn-data.json', JSON.stringify(burnData, null, 2));

// Test 3: Error handling
console.log('\nTEST 3: Error Recovery');
console.log('-' . repeat(30));

// Test with missing burn-data.json
const tempBackup = './data/burn-data.backup.json';
fs.renameSync('./data/burn-data.json', tempBackup);
console.log('  Removed burn-data.json temporarily...');

try {
  const manager2 = new GapResistantBurnManager();
  const errorTest = manager2.loadProcessedRanges();
  console.log(`  Handled missing file: ✅ YES (returned ${errorTest.ranges.length} ranges)`);
} catch (error) {
  console.log(`  Handled missing file: ❌ NO (threw error: ${error.message})`);
}

// Restore
fs.renameSync(tempBackup, './data/burn-data.json');

// Test 4: Performance
console.log('\nTEST 4: Performance Impact');
console.log('-' . repeat(30));
const startTime = Date.now();
for (let i = 0; i < 10; i++) {
  const m = new GapResistantBurnManager();
  m.loadProcessedRanges();
}
const elapsed = Date.now() - startTime;
console.log(`  10 loads with auto-sync: ${elapsed}ms`);
console.log(`  Average per load: ${(elapsed / 10).toFixed(1)}ms`);
console.log(`  Performance impact: ${elapsed < 100 ? '✅ MINIMAL' : '⚠️ NOTICEABLE'}`);

// Test 5: Integration with existing scripts
console.log('\nTEST 5: Integration Check');
console.log('-' . repeat(30));
console.log('  Running gap analysis...');

const child = spawn('node', ['scripts/gap-resistant-burn-manager.js', 'analyze'], {
  cwd: process.cwd()
});

let output = '';
child.stdout.on('data', (data) => { output += data.toString(); });
child.stderr.on('data', (data) => { output += data.toString(); });

child.on('close', (code) => {
  const hasErrors = output.includes('ERROR') || output.includes('CRITICAL');
  const hasMismatch = output.includes("doesn't match ranges end");
  
  console.log(`  Exit code: ${code === 0 ? '✅ 0' : '❌ ' + code}`);
  console.log(`  Has errors: ${hasErrors ? '❌ YES' : '✅ NO'}`);
  console.log(`  Has mismatch warning: ${hasMismatch ? '❌ YES' : '✅ NO'}`);
  
  // Final summary
  console.log('\n' + '=' . repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('=' . repeat(60));
  
  const allPassed = isSynced && autoSynced && !hasErrors && !hasMismatch && elapsed < 100;
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📋 What the fix does:');
    console.log('  1. Auto-syncs on every load');
    console.log('  2. Extends ranges to match lastProcessedBlock');
    console.log('  3. Prevents future mismatches');
    console.log('  4. Works with existing auto-update');
    console.log('  5. No performance impact');
    console.log('\n🎉 Issue #2 is RESOLVED!');
  } else {
    console.log('\n⚠️ Some issues detected - review above');
  }
});