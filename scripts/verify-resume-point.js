const fs = require('fs');

async function verifyResumePoint() {
  console.log('🔍 Verifying Resume Point Logic\n');
  
  // Load current data
  const dataPath = '/home/wsl/projects/TINC/public/data/burn-data.json';
  const burnData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Extract all blocks with burns
  const burnBlocks = [];
  burnData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      if (tx.blockNumber) {
        burnBlocks.push({
          block: tx.blockNumber,
          hash: tx.hash,
          amount: tx.amount,
          date: day.date
        });
      }
    });
  });
  
  // Sort by block number
  burnBlocks.sort((a, b) => a.block - b.block);
  
  const actualLastBurnBlock = burnBlocks[burnBlocks.length - 1]?.block;
  const recordedLastBlock = burnData.lastProcessedBlock;
  
  console.log('📊 Resume Point Analysis:');
  console.log(`  • Recorded lastProcessedBlock: ${recordedLastBlock || 'NOT SET'}`);
  console.log(`  • Actual last burn block: ${actualLastBurnBlock}`);
  console.log(`  • Total burns tracked: ${burnBlocks.length}\n`);
  
  // Check for issues
  const issues = [];
  
  if (!recordedLastBlock) {
    issues.push({
      severity: 'CRITICAL',
      issue: 'No lastProcessedBlock set',
      impact: 'Incremental updates will fail or reprocess data'
    });
  } else if (recordedLastBlock < actualLastBurnBlock) {
    issues.push({
      severity: 'ERROR',
      issue: `lastProcessedBlock (${recordedLastBlock}) < last burn (${actualLastBurnBlock})`,
      impact: 'Data inconsistency - processed beyond recorded point'
    });
  } else if (recordedLastBlock > actualLastBurnBlock + 10000) {
    issues.push({
      severity: 'WARNING',
      issue: `Large gap between lastProcessedBlock and last burn (${recordedLastBlock - actualLastBurnBlock} blocks)`,
      impact: 'May indicate processing empty blocks or missed burns'
    });
  }
  
  // Simulate next update
  console.log('🔄 Next Update Simulation:');
  if (recordedLastBlock) {
    const currentBlock = 23243000; // Approximate
    const blocksToProcess = currentBlock - recordedLastBlock;
    
    console.log(`  • Would start from: ${recordedLastBlock + 1}`);
    console.log(`  • Would end at: ${currentBlock}`);
    console.log(`  • Blocks to process: ${blocksToProcess}`);
    
    if (blocksToProcess < 0) {
      issues.push({
        severity: 'ERROR',
        issue: 'Negative blocks to process',
        impact: 'Update logic is broken - would skip blocks'
      });
    } else if (blocksToProcess > 50000) {
      issues.push({
        severity: 'WARNING',
        issue: 'Very large block range to process',
        impact: 'May timeout or hit RPC limits'
      });
    }
  }
  
  // Check block continuity
  console.log('\n🔍 Block Continuity Check:');
  let discontinuities = 0;
  let maxGap = 0;
  
  for (let i = 1; i < burnBlocks.length; i++) {
    const gap = burnBlocks[i].block - burnBlocks[i-1].block;
    if (gap > 1000) {
      discontinuities++;
      maxGap = Math.max(maxGap, gap);
    }
  }
  
  console.log(`  • Discontinuities (>1000 blocks): ${discontinuities}`);
  console.log(`  • Largest gap: ${maxGap} blocks (~${(maxGap * 12 / 3600).toFixed(1)} hours)`);
  
  if (discontinuities > 50) {
    issues.push({
      severity: 'WARNING',
      issue: `High number of discontinuities (${discontinuities})`,
      impact: 'Indicates frequent fetch failures or gaps'
    });
  }
  
  // Report
  console.log('\n═══════════════════════════════════════════');
  console.log('           RESUME POINT VERDICT             ');
  console.log('═══════════════════════════════════════════\n');
  
  if (issues.length === 0) {
    console.log('✅ Resume point logic appears correct');
  } else {
    issues.forEach(issue => {
      const icon = issue.severity === 'CRITICAL' ? '🔴' :
                   issue.severity === 'ERROR' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.severity}: ${issue.issue}`);
      console.log(`   Impact: ${issue.impact}\n`);
    });
  }
  
  // Recommendation
  console.log('📋 Recommendation:');
  if (recordedLastBlock > actualLastBurnBlock) {
    console.log('  The lastProcessedBlock is set correctly for future updates.');
    console.log('  However, there are gaps in historical data that need backfilling.');
  } else {
    console.log('  Fix the lastProcessedBlock tracking immediately.');
    console.log('  Run a full refresh to ensure data integrity.');
  }
}

verifyResumePoint().catch(console.error);