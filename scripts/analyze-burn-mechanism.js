const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

// Contracts that might burn TINC
const CONTRACTS = {
  '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3': 'UniversalBuyAndBurn',
  '0x52c1cc79fbbef91d3952ae75b1961d08f0172223': 'FarmKeeper',
  '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5': 'PeggedFarmKeeper'
};

// Actual burn addresses
const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead'
];

async function analyzeBurnMechanism() {
  console.log('🔍 Analyzing TINC Burn Mechanism\n');
  
  // Get recent transfers
  const startBlock = 23230000;
  const endBlock = 23242000;
  
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  const response = await axios.get(url);
  
  if (response.data.status !== '1') {
    console.log('Error fetching data');
    return;
  }
  
  const transfers = response.data.result;
  
  // Analyze transfers
  const transfersToContracts = [];
  const actualBurns = [];
  
  transfers.forEach(tx => {
    const to = tx.to.toLowerCase();
    const from = tx.from.toLowerCase();
    
    // Check if this is a transfer TO a contract
    if (CONTRACTS[to]) {
      transfersToContracts.push({
        hash: tx.hash,
        from: from,
        to: to,
        contract: CONTRACTS[to],
        amount: parseFloat(tx.value) / 1e18,
        block: tx.blockNumber
      });
    }
    
    // Check if this is an actual burn (to 0x0 or dead)
    if (BURN_ADDRESSES.includes(to)) {
      actualBurns.push({
        hash: tx.hash,
        from: from,
        to: to,
        amount: parseFloat(tx.value) / 1e18,
        block: tx.blockNumber,
        fromContract: CONTRACTS[from] || 'User/Other'
      });
    }
  });
  
  console.log('═══════════════════════════════════════════');
  console.log('         BURN MECHANISM ANALYSIS            ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`📊 Found ${transfersToContracts.length} transfers TO contracts`);
  console.log(`🔥 Found ${actualBurns.length} actual burns (to 0x0 or dead)\n`);
  
  // Check if contracts are burning
  console.log('🔍 Checking if contracts are the ones burning:\n');
  
  const burnsBySource = {};
  actualBurns.forEach(burn => {
    const source = burn.fromContract;
    if (!burnsBySource[source]) {
      burnsBySource[source] = {
        count: 0,
        total: 0
      };
    }
    burnsBySource[source].count++;
    burnsBySource[source].total += burn.amount;
  });
  
  console.log('Burns by Source:');
  Object.entries(burnsBySource).forEach(([source, data]) => {
    console.log(`  • ${source}: ${data.count} burns, ${data.total.toFixed(2)} TINC`);
  });
  
  // Sample some transfers to contracts
  console.log('\n📋 Sample transfers TO contracts (not burns):');
  transfersToContracts.slice(0, 5).forEach(tx => {
    console.log(`  • ${tx.hash.slice(0, 10)}... → ${tx.contract}: ${tx.amount.toFixed(2)} TINC`);
  });
  
  // Sample actual burns
  console.log('\n🔥 Sample ACTUAL burns (to 0x0 or dead):');
  actualBurns.slice(0, 5).forEach(burn => {
    const dest = burn.to === '0x0000000000000000000000000000000000000000' ? '0x0' : 'dead';
    console.log(`  • ${burn.hash.slice(0, 10)}... from ${burn.fromContract} → ${dest}: ${burn.amount.toFixed(2)} TINC`);
  });
  
  // Analysis conclusion
  console.log('\n📊 CONCLUSION:');
  if (actualBurns.length > 0 && actualBurns.every(b => b.fromContract === 'User/Other')) {
    console.log('  ✅ Burns are happening directly from users to 0x0/dead');
    console.log('  ✅ Our current script monitoring 0x0 should capture these');
  } else if (Object.keys(burnsBySource).some(s => s !== 'User/Other')) {
    console.log('  ⚠️  Some burns are coming FROM contracts');
    console.log('  ⚠️  This means contracts receive TINC then burn it');
  }
  
  console.log('\n❓ Key Question:');
  console.log('  Are the transfers TO contracts being burned later?');
  console.log('  Need to trace what happens to TINC sent to these contracts.');
}

analyzeBurnMechanism().catch(console.error);