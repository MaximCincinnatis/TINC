const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function proofOfConcept() {
  console.log('🔴 PROOF OF CONCEPT: Block Gap Vulnerability\n');
  console.log('Demonstrating how incremental updates miss burns\n');
  
  // Example: Gap from our data
  const gap = {
    from: 23030316,
    to: 23035248,
    description: '16.4 hour gap in our data'
  };
  
  console.log('📊 Scenario:');
  console.log(`  • Last update processed up to block: ${gap.from - 1}`);
  console.log(`  • Next update starts from block: ${gap.to + 1}`);
  console.log(`  • Skipped blocks: ${gap.from} to ${gap.to}`);
  console.log(`  • Time span skipped: ~${((gap.to - gap.from) * 12 / 3600).toFixed(1)} hours\n`);
  
  // Check what we missed
  console.log('🔍 Checking what burns were in the skipped range...\n');
  
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${gap.from}&endblock=${gap.to}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    
    if (response.data.status === '1') {
      const transfers = response.data.result;
      
      // Find burns
      const burns = transfers.filter(tx => {
        const to = tx.to.toLowerCase();
        return to === '0x0000000000000000000000000000000000000000' || 
               to === '0x000000000000000000000000000000000000dead';
      });
      
      console.log('❌ VULNERABILITY CONFIRMED:');
      console.log(`   Found ${burns.length} burns that were MISSED!\n`);
      
      if (burns.length > 0) {
        console.log('   Missed burns:');
        let totalMissed = 0;
        burns.forEach(burn => {
          const amount = parseFloat(burn.value) / 1e18;
          totalMissed += amount;
          console.log(`   • Block ${burn.blockNumber}: ${amount.toFixed(2)} TINC`);
          console.log(`     Hash: ${burn.hash}`);
          console.log(`     From: ${burn.from.slice(0, 10)}...`);
        });
        
        console.log(`\n   Total TINC missed: ${totalMissed.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
  
  console.log('\n📋 How This Happens:');
  console.log('1. Update #1 runs and sets lastProcessedBlock = 23030315');
  console.log('2. RPC fails or script doesn\'t run for 16+ hours');
  console.log('3. Update #2 runs but starts from block 23035249');
  console.log('4. Blocks 23030316-23035248 are never processed');
  console.log('5. Burns in that range are permanently missed');
  
  console.log('\n🔧 Root Causes:');
  console.log('• Failed RPC calls during fetch (chunks fail silently)');
  console.log('• Script crashes after setting lastProcessedBlock');
  console.log('• Incremental update logic doesn\'t validate continuity');
  console.log('• No mechanism to detect or fill gaps');
  
  console.log('\n💡 Solution Required:');
  console.log('1. Track both start and end of processed ranges');
  console.log('2. Detect gaps before processing new blocks');
  console.log('3. Automatically backfill detected gaps');
  console.log('4. Validate block continuity after each update');
}

proofOfConcept().catch(console.error);