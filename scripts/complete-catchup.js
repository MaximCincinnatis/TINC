#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Complete Catchup Script
 * Runs until ALL gaps are filled
 */

const GapResistantBurnManager = require('./gap-resistant-burn-manager');
const GapBackfillService = require('./gap-backfill-service');

async function runCompleteCatchup() {
  console.log('🚀 COMPLETE CATCHUP MODE - Running until all gaps are filled!\n');
  
  const startTime = Date.now();
  let totalGapsProcessed = 0;
  let totalBurnsRecovered = 0;
  let iteration = 0;
  
  try {
    while (true) {
      iteration++;
      console.log(`\n📦 Iteration ${iteration}`);
      console.log('=' .repeat(50));
      
      // Check current gaps
      const manager = new GapResistantBurnManager();
      const analysis = await manager.analyze();
      
      if (!analysis.gaps || analysis.gaps.length === 0) {
        console.log('\n✅ SUCCESS! All gaps have been filled!');
        break;
      }
      
      console.log(`\n📊 Gaps remaining: ${analysis.gaps.length}`);
      console.log(`📊 Blocks to fill: ${analysis.gaps.reduce((sum, g) => sum + g.size, 0).toLocaleString()}`);
      
      // Process next batch of gaps (10 at a time for faster processing)
      const batchSize = Math.min(10, analysis.gaps.length);
      console.log(`\n🔧 Processing next ${batchSize} gaps...`);
      
      const backfillService = new GapBackfillService();
      const result = await backfillService.backfillAllGaps(batchSize);
      
      totalGapsProcessed += result.gapsProcessed.length;
      totalBurnsRecovered += result.totalBurnsFound;
      
      // Progress report
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`\n⏱️  Time elapsed: ${(elapsed / 60).toFixed(1)} minutes`);
      console.log(`📈 Total gaps processed: ${totalGapsProcessed}`);
      console.log(`🔥 Total burns recovered: ${totalBurnsRecovered}`);
      
      // Estimate remaining time
      if (totalGapsProcessed > 0) {
        const gapsPerSecond = totalGapsProcessed / elapsed;
        const remainingGaps = analysis.gaps.length - batchSize;
        const estimatedSecondsRemaining = remainingGaps / gapsPerSecond;
        console.log(`⏳ Estimated time remaining: ${(estimatedSecondsRemaining / 60).toFixed(1)} minutes`);
      }
      
      // Small delay between iterations to avoid overwhelming RPC
      console.log('\n💤 Pausing 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final summary
    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(50));
    console.log('         COMPLETE CATCHUP FINISHED!');
    console.log('='.repeat(50));
    console.log(`\n✅ Total gaps filled: ${totalGapsProcessed}`);
    console.log(`🔥 Total burns recovered: ${totalBurnsRecovered}`);
    console.log(`⏱️  Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`📊 Average speed: ${(totalGapsProcessed / (totalTime / 60)).toFixed(1)} gaps/minute`);
    
    // Copy to public folder for deployment
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    const publicPath = path.join(__dirname, '../public/data/burn-data.json');
    
    if (fs.existsSync(dataPath)) {
      fs.copyFileSync(dataPath, publicPath);
      console.log('\n📤 Data copied to public folder');
    }
    
    console.log('\n🎉 System is now fully caught up with 100% block coverage!');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error during catchup:', error.message);
    console.log(`\n⚠️  Stopped after processing ${totalGapsProcessed} gaps`);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  console.log('Starting complete catchup process...');
  console.log('This will run until ALL gaps are filled.');
  console.log('Estimated time: 60-90 minutes for 153 gaps\n');
  
  runCompleteCatchup()
    .then(success => {
      if (success) {
        console.log('\n✅ Complete catchup successful!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Catchup incomplete');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runCompleteCatchup };