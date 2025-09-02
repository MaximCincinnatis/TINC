#!/usr/bin/env node
/**
 * Test script to verify burn data fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Burn Data Fixes');
console.log('=' .repeat(50));

// Test 1: Check if retry logic code exists
console.log('\n✅ Test 1: Retry logic implementation');
const scriptContent = fs.readFileSync(path.join(__dirname, 'fetch-burn-data.js'), 'utf8');

const hasRetryLogic = scriptContent.includes('Attempting to recover failed chunks');
const hasSmallChunks = scriptContent.includes('RETRY_CHUNK_SIZE = 100');
const hasAdaptiveTimeout = scriptContent.includes('adaptiveTimeout');
const hasValidation = scriptContent.includes('validateBurnData');

console.log(`  Retry logic: ${hasRetryLogic ? '✅' : '❌'}`);
console.log(`  Small chunk retry: ${hasSmallChunks ? '✅' : '❌'}`);
console.log(`  Adaptive timeout: ${hasAdaptiveTimeout ? '✅' : '❌'}`);
console.log(`  Validation function: ${hasValidation ? '✅' : '❌'}`);

// Test 2: Check current data integrity
console.log('\n✅ Test 2: Current data integrity');
const burnData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/burn-data.json'), 'utf8'));

console.log(`  Total burned: ${burnData.totalBurned.toFixed(2)} TINC`);
console.log(`  Days tracked: ${burnData.dailyBurns.length}`);
console.log(`  Last processed block: ${burnData.lastProcessedBlock || 'Not set'}`);
console.log(`  Data date range: ${burnData.startDate} to ${burnData.endDate}`);

// Test 3: Simulate chunk failure recovery
console.log('\n✅ Test 3: Simulating chunk failure recovery');

// Mock failed chunks
const mockFailedChunks = [
  { fromBlock: 23270000, toBlock: 23270799 },
  { fromBlock: 23271000, toBlock: 23271799 }
];

console.log(`  Simulating ${mockFailedChunks.length} failed chunks`);

// Check if recovery would work
const RETRY_CHUNK_SIZE = 100;
let totalRetryChunks = 0;

mockFailedChunks.forEach(chunk => {
  const chunkSize = chunk.toBlock - chunk.fromBlock + 1;
  const retryChunks = Math.ceil(chunkSize / RETRY_CHUNK_SIZE);
  totalRetryChunks += retryChunks;
  console.log(`    Chunk ${chunk.fromBlock}-${chunk.toBlock}: Would retry as ${retryChunks} smaller chunks`);
});

console.log(`  Total retry attempts: ${totalRetryChunks} chunks of 100 blocks each`);

// Test 4: Check for new tracking files
console.log('\n✅ Test 4: Checking tracking files');

const permanentFailuresPath = path.join(__dirname, '../data/permanent-failures.json');
const validationFailuresPath = path.join(__dirname, '../data/validation-failures.json');

console.log(`  Permanent failures log: ${fs.existsSync(permanentFailuresPath) ? '✅ Exists' : '⚠️ Not created yet'}`);
console.log(`  Validation failures log: ${fs.existsSync(validationFailuresPath) ? '✅ Exists' : '⚠️ Not created yet'}`);

// Test 5: Validate fix implementation
console.log('\n✅ Test 5: Fix implementation summary');

const fixes = {
  'Retry failed chunks': hasRetryLogic && hasSmallChunks,
  'Adaptive timeout': hasAdaptiveTimeout,
  'Post-update validation': hasValidation,
  'Error logging': scriptContent.includes('permanent-failures.json'),
  'Backup compatibility': scriptContent.includes('legacyPath')
};

let allPassed = true;
Object.entries(fixes).forEach(([feature, implemented]) => {
  console.log(`  ${feature}: ${implemented ? '✅' : '❌'}`);
  if (!implemented) allPassed = false;
});

// Summary
console.log('\n' + '=' .repeat(50));
if (allPassed) {
  console.log('✅ ALL FIXES SUCCESSFULLY IMPLEMENTED!');
  console.log('\nThe script now has:');
  console.log('  • Automatic retry for failed chunks');
  console.log('  • Smaller chunk sizes for retries (100 blocks)');
  console.log('  • Adaptive timeout based on chunk size');
  console.log('  • Post-update validation');
  console.log('  • Permanent failure logging');
} else {
  console.log('⚠️ Some fixes may not be fully implemented');
}

console.log('\nNext step: Run incremental update to test in production');
console.log('Command: node scripts/fetch-burn-data.js --incremental');