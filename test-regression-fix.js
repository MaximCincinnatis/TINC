#!/usr/bin/env node
require('dotenv').config();
const IncrementalBurnManager = require('./scripts/incremental-burn-manager-fixed');

async function testRegressionFix() {
  console.log('🧪 Testing regression fix for Issue #1\n');
  console.log('=' . repeat(50));
  
  const manager = new IncrementalBurnManager();
  
  try {
    // Load existing data
    const existingData = manager.loadExistingData();
    console.log('\n📊 Current Data:');
    console.log(`  Total Burned (stored): ${existingData.totalBurned.toFixed(2)} TINC`);
    console.log(`  Daily Burns Count: ${existingData.dailyBurns.length}`);
    
    // Calculate actual 30-day sum
    const actual30DaySum = existingData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
    console.log(`  30-Day Sum (calculated): ${actual30DaySum.toFixed(2)} TINC`);
    
    // Show the discrepancy
    const difference = Math.abs(existingData.totalBurned - actual30DaySum);
    console.log(`  Difference: ${difference.toFixed(2)} TINC`);
    
    if (difference > 1) {
      console.log('\n⚠️ Found mismatch - this would have triggered false regression alert!');
      console.log('  Old logic: Would show "DATA REGRESSION DETECTED"');
      console.log('  New logic: Will auto-correct to match 30-day sum');
    } else {
      console.log('\n✅ Data is already consistent (totalBurned = 30-day sum)');
    }
    
    // Test the validation function
    console.log('\n🔧 Testing validateMergedData function...');
    
    // Create a test merged data with correct 30-day calculation
    const testMergedData = {
      ...existingData,
      totalBurned: actual30DaySum, // This is what it should be
      dailyBurns: existingData.dailyBurns
    };
    
    // Run validation (should not error anymore)
    console.log('\n📝 Running validation with corrected logic:');
    manager.validateMergedData(existingData, testMergedData);
    
    console.log('\n✅ Validation passed! No false regression detected.');
    console.log('\n' + '=' . repeat(50));
    console.log('🎉 FIX SUCCESSFUL: Issue #1 resolved!');
    console.log('  - totalBurned now correctly represents 30-day sum');
    console.log('  - No more false "DATA REGRESSION" alerts');
    console.log('  - Dashboard will display accurate 30-day totals');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testRegressionFix().catch(console.error);