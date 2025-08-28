const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

// All burn addresses
const BURN_ADDRESSES = [
  '0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3', // UniversalBuyAndBurn
  '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223', // FarmKeeper
  '0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5', // PeggedFarmKeeper
  '0x0000000000000000000000000000000000000000',  // Zero
  '0x000000000000000000000000000000000000dead'   // Dead
].map(a => a.toLowerCase());

async function quickTest() {
  console.log('🚀 Quick Test: Fetching burns from last 24 hours\n');
  
  // Get burns from last 24 hours (approximately 7200 blocks)
  const currentBlock = 23242000; // Approximate
  const startBlock = currentBlock - 7200;
  
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${startBlock}&endblock=${currentBlock}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  const response = await axios.get(url);
  
  if (response.data.status !== '1') {
    console.log('Error fetching data');
    return;
  }
  
  const allTransfers = response.data.result;
  
  // Filter burns
  const burns = allTransfers.filter(tx => 
    BURN_ADDRESSES.includes(tx.to.toLowerCase())
  );
  
  // Group by destination
  const burnsByDestination = {};
  burns.forEach(burn => {
    const dest = burn.to.toLowerCase();
    if (!burnsByDestination[dest]) {
      burnsByDestination[dest] = {
        count: 0,
        totalAmount: 0,
        transactions: []
      };
    }
    burnsByDestination[dest].count++;
    burnsByDestination[dest].totalAmount += parseFloat(burn.value) / 1e18;
    burnsByDestination[dest].transactions.push({
      hash: burn.hash,
      amount: parseFloat(burn.value) / 1e18,
      block: burn.blockNumber
    });
  });
  
  console.log('═══════════════════════════════════════════');
  console.log('     24-HOUR BURN ANALYSIS RESULTS         ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`📊 Total Burns Found: ${burns.length}\n`);
  
  console.log('🎯 Burns by Destination:\n');
  Object.entries(burnsByDestination).forEach(([addr, data]) => {
    const label = 
      addr === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' ? 'UniversalBuyAndBurn' :
      addr === '0x52c1cc79fbbef91d3952ae75b1961d08f0172223' ? 'FarmKeeper' :
      addr === '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5' ? 'PeggedFarmKeeper' :
      addr === '0x000000000000000000000000000000000000dead' ? 'Dead Address' :
      'Zero Address';
    
    console.log(`  ${label}:`);
    console.log(`    • Count: ${data.count} burns`);
    console.log(`    • Total: ${data.totalAmount.toFixed(2)} TINC`);
    console.log(`    • Average: ${(data.totalAmount / data.count).toFixed(2)} TINC per burn`);
    
    // Show last 3 transactions
    const recent = data.transactions.slice(-3);
    console.log(`    • Recent burns:`);
    recent.forEach(tx => {
      console.log(`      - ${tx.hash.slice(0, 10)}... : ${tx.amount.toFixed(2)} TINC`);
    });
    console.log();
  });
  
  // Analysis
  const hasMultipleDestinations = Object.keys(burnsByDestination).length > 1;
  const hasNonZeroBurns = Object.keys(burnsByDestination).some(addr => 
    addr !== '0x0000000000000000000000000000000000000000' &&
    addr !== '0x000000000000000000000000000000000000dead'
  );
  
  console.log('📋 Key Findings:');
  if (hasMultipleDestinations) {
    console.log('  ✅ Burns go to multiple addresses (not just 0x0)');
  }
  if (hasNonZeroBurns) {
    console.log('  ✅ Protocol-specific burn addresses are active');
  }
  
  const totalBurned = Object.values(burnsByDestination)
    .reduce((sum, data) => sum + data.totalAmount, 0);
  
  console.log(`\n💰 Total TINC Burned (24h): ${totalBurned.toFixed(2)} TINC`);
  
  // Show what old script would miss
  const missedBurns = burns.filter(tx => 
    tx.to.toLowerCase() !== '0x0000000000000000000000000000000000000000'
  );
  
  if (missedBurns.length > 0) {
    const missedAmount = missedBurns.reduce((sum, tx) => 
      sum + parseFloat(tx.value) / 1e18, 0
    );
    console.log(`\n⚠️  Old script would miss:`);
    console.log(`  • ${missedBurns.length} burns (${(missedBurns.length / burns.length * 100).toFixed(1)}%)`);
    console.log(`  • ${missedAmount.toFixed(2)} TINC (${(missedAmount / totalBurned * 100).toFixed(1)}%)`);
  }
}

quickTest().catch(console.error);