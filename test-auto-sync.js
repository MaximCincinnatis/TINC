#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Auto-Sync Fix for Block Tracking\n');
console.log('=' . repeat(60));

// First, show the current state
const burnData = JSON.parse(fs.readFileSync('./data/burn-data.json', 'utf8'));
const oldRanges = JSON.parse(fs.readFileSync('./data/processed-ranges.json', 'utf8'));

console.log('📊 BEFORE Auto-Sync:');
console.log(`  lastProcessedBlock: ${burnData.lastProcessedBlock}`);
console.log(`  Ranges tracked: ${oldRanges.ranges.length}`);
console.log(`  Last range end: ${oldRanges.ranges[oldRanges.ranges.length - 1].end}`);
console.log(`  Gap size: ${burnData.lastProcessedBlock - oldRanges.ranges[oldRanges.ranges.length - 1].end} blocks`);

// Backup the original ranges file
const backupPath = './data/processed-ranges.backup.json';
fs.writeFileSync(backupPath, JSON.stringify(oldRanges, null, 2));
console.log(`\n💾 Backed up original ranges to: ${backupPath}`);

// Now run the gap manager with auto-sync
console.log('\n🔄 Running gap-resistant manager with auto-sync...\n');

const GapResistantBurnManager = require('./scripts/gap-resistant-burn-manager');
const manager = new GapResistantBurnManager();

// Test the loadProcessedRanges function
const syncedData = manager.loadProcessedRanges();

console.log('\n📊 AFTER Auto-Sync:');
console.log(`  Ranges tracked: ${syncedData.ranges.length}`);
console.log(`  Last range end: ${syncedData.ranges[syncedData.ranges.length - 1].end}`);
console.log(`  Now matches lastProcessedBlock: ${syncedData.ranges[syncedData.ranges.length - 1].end === burnData.lastProcessedBlock ? '✅ YES' : '❌ NO'}`);

// Show the new range that was added
if (syncedData.ranges.length > oldRanges.ranges.length) {
  const newRange = syncedData.ranges[syncedData.ranges.length - 1];
  console.log(`\n➕ New range added by auto-sync:`);
  console.log(`   Start: ${newRange.start}`);
  console.log(`   End: ${newRange.end}`);
  console.log(`   Size: ${newRange.end - newRange.start + 1} blocks`);
}

// Save the synced data
manager.saveProcessedRanges(syncedData);

console.log('\n' + '=' . repeat(60));
console.log('✅ AUTO-SYNC TEST COMPLETE');
console.log('=' . repeat(60));

// Verify the fix worked
if (syncedData.ranges[syncedData.ranges.length - 1].end === burnData.lastProcessedBlock) {
  console.log('\n🎉 SUCCESS: Block tracking systems are now synchronized!');
  console.log('   - Gap manager now tracks up to block', burnData.lastProcessedBlock);
  console.log('   - No more false "45,466 block gap" warnings');
  console.log('   - Future updates will auto-sync');
} else {
  console.log('\n❌ FAILED: Systems still not in sync');
  process.exit(1);
}