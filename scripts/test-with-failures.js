#!/usr/bin/env node
/**
 * Test script to simulate failures and verify retry logic
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Temporarily modify callRPC to simulate failures
const originalScript = fs.readFileSync(path.join(__dirname, 'fetch-burn-data.js'), 'utf8');

// Create a test version that simulates failures
const testScript = originalScript.replace(
  'async function callRPC(method, params, retryCount = 0) {',
  `async function callRPC(method, params, retryCount = 0) {
    // TESTING: Simulate 30% failure rate
    if (Math.random() < 0.3 && retryCount === 0) {
      console.log('  🧪 SIMULATED FAILURE for testing retry logic');
      throw new Error('Simulated RPC failure for testing');
    }`
);

// Save test version
fs.writeFileSync(path.join(__dirname, 'fetch-burn-data-test.js'), testScript);

console.log('🧪 Testing Retry Logic with Simulated Failures');
console.log('=' .repeat(50));
console.log('Simulating 30% RPC failure rate...\n');

// Run the test version
const { spawn } = require('child_process');
const child = spawn('node', [path.join(__dirname, 'fetch-burn-data-test.js'), '--incremental']);

let output = '';
let sawRetry = false;
let sawRecovery = false;
let sawValidation = false;

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  
  // Check for retry logic
  if (text.includes('Attempting to recover failed chunks')) {
    sawRetry = true;
    console.log('✅ Retry logic triggered!');
  }
  
  if (text.includes('Recovered') && text.includes('burns from blocks')) {
    sawRecovery = true;
    console.log('✅ Successfully recovered failed chunks!');
  }
  
  if (text.includes('Validating updated burn data')) {
    sawValidation = true;
    console.log('✅ Validation running!');
  }
  
  // Show key lines
  if (text.includes('SIMULATED FAILURE') || 
      text.includes('Retrying chunk') || 
      text.includes('Recovered') ||
      text.includes('validation')) {
    process.stdout.write('  ' + text.trim() + '\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  // Clean up test file
  fs.unlinkSync(path.join(__dirname, 'fetch-burn-data-test.js'));
  
  console.log('\n' + '=' .repeat(50));
  console.log('Test Results:');
  console.log(`  Process exit code: ${code}`);
  console.log(`  Retry logic triggered: ${sawRetry ? '✅' : '❌'}`);
  console.log(`  Recovery successful: ${sawRecovery ? '✅' : '❌'}`);
  console.log(`  Validation ran: ${sawValidation ? '✅' : '❌'}`);
  
  if (code === 0) {
    console.log('\n✅ Test PASSED - Script handled failures gracefully!');
  } else {
    console.log('\n❌ Test failed - Script did not complete successfully');
  }
});

// Timeout after 60 seconds
setTimeout(() => {
  console.log('\n⏱️ Test timed out after 60 seconds');
  child.kill();
}, 60000);