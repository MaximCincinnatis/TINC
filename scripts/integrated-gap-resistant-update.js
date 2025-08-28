#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Integrated Gap-Resistant Update System
 * Combines gap detection, backfill, and update in one script
 */

const GapResistantBurnManager = require('./gap-resistant-burn-manager');
const GapBackfillService = require('./gap-backfill-service');
const GapResistantFetch = require('./gap-resistant-fetch');

async function runIntegratedUpdate() {
  console.log('🚀 Starting Integrated Gap-Resistant Update\n');
  console.log('This will:');
  console.log('1. Detect gaps in historical data');
  console.log('2. Backfill missing burns');
  console.log('3. Update with new burns\n');
  
  try {
    // Step 1: Analyze current state
    console.log('Step 1: Analyzing current data...\n');
    const manager = new GapResistantBurnManager();
    const analysis = await manager.analyze();
    
    // Step 2: Backfill gaps if found
    if (analysis.gaps && analysis.gaps.length > 0) {
      console.log(`\nStep 2: Found ${analysis.gaps.length} gaps - starting backfill...\n`);
      const backfillService = new GapBackfillService();
      
      // Process up to 5 gaps per run to avoid timeout
      const result = await backfillService.backfillAllGaps(5);
      console.log(`\n✅ Backfilled ${result.totalBurnsFound} burns totaling ${result.totalTincRecovered.toFixed(2)} TINC`);
    } else {
      console.log('\nStep 2: No gaps to backfill ✅');
    }
    
    // Step 3: Run gap-protected update for new blocks
    console.log('\nStep 3: Fetching new burns with gap protection...\n');
    const fetcher = new GapResistantFetch();
    const updateResult = await fetcher.runGapResistantUpdate();
    
    // Step 4: Final report
    console.log('\n════════════════════════════════════════════');
    console.log('         UPDATE COMPLETE                     ');
    console.log('════════════════════════════════════════════\n');
    
    // Check remaining gaps
    const finalAnalysis = await manager.analyze();
    
    console.log('📊 Final Status:');
    console.log(`  • Total gaps remaining: ${finalAnalysis.gaps.length}`);
    console.log(`  • Coverage: See report above`);
    
    if (finalAnalysis.gaps.length > 0) {
      console.log(`\n💡 Note: ${finalAnalysis.gaps.length} gaps remain. Run again to continue backfilling.`);
    } else {
      console.log('\n✅ All gaps filled! Data is complete.');
    }
    
    // Copy to public folder for Vercel
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    const publicPath = path.join(__dirname, '../public/data/burn-data.json');
    
    if (fs.existsSync(dataPath)) {
      fs.copyFileSync(dataPath, publicPath);
      console.log('\n📤 Data copied to public folder for deployment');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Error during update:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runIntegratedUpdate()
    .then(success => {
      if (success) {
        console.log('\n✅ Integrated update completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Update failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runIntegratedUpdate };