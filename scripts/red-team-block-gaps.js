const fs = require('fs');
const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function redTeamBlockGaps() {
  console.log('🔴 RED TEAM: Block Gap Analysis\n');
  console.log('Testing if incremental updates miss blocks between runs\n');
  
  // Load our current burn data
  const dataPath = '/home/wsl/projects/TINC/public/data/burn-data.json';
  const burnData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Extract all block numbers from our data
  const ourBlocks = new Set();
  const blockRanges = [];
  
  burnData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      if (tx.blockNumber) {
        ourBlocks.add(tx.blockNumber);
      }
    });
  });
  
  // Convert to sorted array
  const sortedBlocks = Array.from(ourBlocks).sort((a, b) => a - b);
  
  console.log('📊 Our Data Analysis:');
  console.log(`  • Total unique blocks with burns: ${sortedBlocks.length}`);
  console.log(`  • Block range: ${sortedBlocks[0]} to ${sortedBlocks[sortedBlocks.length - 1]}`);
  console.log(`  • lastProcessedBlock field: ${burnData.lastProcessedBlock || 'NOT SET'}\n`);
  
  // Check for gaps in our block coverage
  const gaps = [];
  for (let i = 1; i < sortedBlocks.length; i++) {
    const gap = sortedBlocks[i] - sortedBlocks[i-1];
    if (gap > 1000) { // Significant gap (more than ~3 hours)
      gaps.push({
        from: sortedBlocks[i-1],
        to: sortedBlocks[i],
        size: gap,
        hours: (gap * 12 / 3600).toFixed(1)
      });
    }
  }
  
  if (gaps.length > 0) {
    console.log('⚠️  Found Block Gaps in Our Data:');
    gaps.forEach(gap => {
      console.log(`  • Blocks ${gap.from} to ${gap.to}: Gap of ${gap.size} blocks (~${gap.hours} hours)`);
    });
    console.log();
  }
  
  // Check if burns exist in these gaps
  console.log('🔍 Checking for burns in gaps...\n');
  
  for (const gap of gaps.slice(0, 3)) { // Check first 3 gaps
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${gap.from + 1}&endblock=${gap.to - 1}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    
    try {
      const response = await axios.get(url);
      if (response.data.status === '1') {
        const transfers = response.data.result;
        const burns = transfers.filter(tx => 
          tx.to === '0x0000000000000000000000000000000000000000' ||
          tx.to === '0x000000000000000000000000000000000000dead'
        );
        
        if (burns.length > 0) {
          console.log(`❌ GAP ${gap.from}-${gap.to}: Found ${burns.length} MISSING burns!`);
          const totalMissing = burns.reduce((sum, b) => sum + parseFloat(b.value) / 1e18, 0);
          console.log(`   Missing TINC: ${totalMissing.toFixed(2)}`);
          burns.slice(0, 3).forEach(burn => {
            console.log(`   • ${burn.hash.slice(0, 10)}... - ${(parseFloat(burn.value) / 1e18).toFixed(2)} TINC (block ${burn.blockNumber})`);
          });
        } else {
          console.log(`✅ GAP ${gap.from}-${gap.to}: No burns in this gap`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error checking gap ${gap.from}-${gap.to}: ${error.message}`);
    }
  }
  
  // Test incremental update logic
  console.log('\n🔍 Testing Incremental Update Logic:\n');
  
  // Simulate what would happen on next update
  const lastBlock = burnData.lastProcessedBlock || sortedBlocks[sortedBlocks.length - 1];
  const currentBlock = 23242720; // Approximate current
  
  console.log(`📦 Next Incremental Update Would:`);
  console.log(`  • Start from block: ${lastBlock + 1}`);
  console.log(`  • End at block: ${currentBlock}`);
  console.log(`  • Blocks to process: ${currentBlock - lastBlock}`);
  console.log(`  • Time span: ~${((currentBlock - lastBlock) * 12 / 3600).toFixed(1)} hours\n`);
  
  // Check if lastProcessedBlock matches our actual last burn
  if (burnData.lastProcessedBlock) {
    const actualLastBurn = sortedBlocks[sortedBlocks.length - 1];
    if (burnData.lastProcessedBlock < actualLastBurn) {
      console.log('⚠️  ISSUE FOUND:');
      console.log(`  lastProcessedBlock (${burnData.lastProcessedBlock}) < actual last burn (${actualLastBurn})`);
      console.log('  This means we processed beyond lastProcessedBlock!');
    } else if (burnData.lastProcessedBlock > actualLastBurn) {
      console.log('⚠️  POTENTIAL ISSUE:');
      console.log(`  lastProcessedBlock (${burnData.lastProcessedBlock}) > actual last burn (${actualLastBurn})`);
      console.log('  We may have processed empty blocks or missed recording burns');
    }
  } else {
    console.log('❌ CRITICAL: lastProcessedBlock not set!');
    console.log('   Incremental updates will not work correctly');
    console.log('   Risk of reprocessing or missing blocks');
  }
  
  // Check for timing issues
  console.log('\n⏰ Timing Analysis:');
  const lastUpdate = burnData.timestamp || burnData.fetchedAt;
  if (lastUpdate) {
    const lastUpdateTime = new Date(lastUpdate);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdateTime) / 3600000;
    console.log(`  • Last update: ${lastUpdateTime.toISOString()}`);
    console.log(`  • Hours since update: ${hoursSinceUpdate.toFixed(1)}`);
    console.log(`  • Expected new blocks: ~${Math.floor(hoursSinceUpdate * 300)} blocks`);
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('              VULNERABILITY REPORT           ');
  console.log('═══════════════════════════════════════════\n');
  
  const issues = [];
  
  if (!burnData.lastProcessedBlock) {
    issues.push('🔴 CRITICAL: No lastProcessedBlock tracking - incremental updates broken');
  }
  
  if (gaps.length > 0) {
    issues.push(`⚠️  WARNING: ${gaps.length} block gaps found in historical data`);
  }
  
  if (gaps.some(g => g.size > 10000)) {
    issues.push('⚠️  WARNING: Large gaps (>10k blocks) suggest failed updates');
  }
  
  if (issues.length > 0) {
    console.log('Issues Found:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('✅ No critical issues found');
  }
}

redTeamBlockGaps().catch(console.error);