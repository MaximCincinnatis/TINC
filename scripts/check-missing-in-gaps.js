const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function checkMissingInGaps() {
  console.log('🔍 Checking for burns in specific large gaps\n');
  
  // Focus on the largest gaps
  const largeGaps = [
    { from: 23079775, to: 23085708, hours: 19.8 },
    { from: 23175048, to: 23180401, hours: 17.8 },
    { from: 23030316, to: 23035248, hours: 16.4 },
    { from: 23195620, to: 23200432, hours: 16.0 },
    { from: 23116210, to: 23120858, hours: 15.5 }
  ];
  
  let totalMissingBurns = 0;
  let totalMissingTINC = 0;
  
  for (const gap of largeGaps) {
    console.log(`\nChecking gap: ${gap.from} to ${gap.to} (~${gap.hours} hours)`);
    
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${gap.from}&endblock=${gap.to}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    
    try {
      const response = await axios.get(url);
      
      if (response.data.status === '1') {
        const transfers = response.data.result;
        
        // Find burns (transfers to 0x0 or dead)
        const burns = transfers.filter(tx => {
          const to = tx.to.toLowerCase();
          return to === '0x0000000000000000000000000000000000000000' || 
                 to === '0x000000000000000000000000000000000000dead';
        });
        
        if (burns.length > 0) {
          console.log(`  ❌ Found ${burns.length} MISSING burns!`);
          
          let gapTotal = 0;
          burns.forEach(burn => {
            const amount = parseFloat(burn.value) / 1e18;
            gapTotal += amount;
            console.log(`     • ${burn.hash.slice(0, 10)}... : ${amount.toFixed(2)} TINC (block ${burn.blockNumber})`);
            console.log(`       From: ${burn.from.slice(0, 10)}...`);
          });
          
          console.log(`  💰 Total missing in gap: ${gapTotal.toFixed(2)} TINC`);
          totalMissingBurns += burns.length;
          totalMissingTINC += gapTotal;
        } else {
          console.log(`  ✅ No burns in this gap`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error checking gap: ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('         MISSING BURNS SUMMARY              ');
  console.log('═══════════════════════════════════════════\n');
  
  if (totalMissingBurns > 0) {
    console.log(`❌ CRITICAL FINDING:`);
    console.log(`   • Missing burns: ${totalMissingBurns}`);
    console.log(`   • Missing TINC: ${totalMissingTINC.toFixed(2)}`);
    console.log(`\n   These burns fell in block gaps and were never captured!`);
  } else {
    console.log(`✅ No burns found in the gaps checked`);
    console.log(`   The gaps appear to be periods without burn activity`);
  }
  
  // Explain the gaps
  console.log('\n📊 Gap Analysis:');
  console.log('   Gaps could be caused by:');
  console.log('   1. No burn activity during those periods (best case)');
  console.log('   2. Failed RPC calls during fetch (chunk failures)');
  console.log('   3. Script not running during those periods');
  console.log('   4. Block range calculation errors in incremental updates');
}

checkMissingInGaps().catch(console.error);