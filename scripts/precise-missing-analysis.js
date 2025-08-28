const fs = require('fs');
const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function preciseMissingAnalysis() {
  console.log('🔍 Precise Analysis of Missing Burns\n');
  
  // Load our recorded burns
  const ourData = JSON.parse(fs.readFileSync('public/data/burn-data.json', 'utf8'));
  const ourBurns = new Map(); // hash -> burn data
  let minBlock = Infinity, maxBlock = 0;
  
  ourData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      ourBurns.set(tx.hash.toLowerCase(), tx);
      if (tx.blockNumber) {
        minBlock = Math.min(minBlock, tx.blockNumber);
        maxBlock = Math.max(maxBlock, tx.blockNumber);
      }
    });
  });
  
  console.log(`📊 Our data:`);
  console.log(`  • ${ourBurns.size} burns recorded`);
  console.log(`  • Block range: ${minBlock} to ${maxBlock}\n`);
  
  // Get ALL token transfers within our block range
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${minBlock}&endblock=${maxBlock}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  console.log('Fetching all transfers in our block range...');
  const response = await axios.get(url);
  
  if (response.data.status !== '1') {
    console.log('Error fetching data');
    return;
  }
  
  const allTransfers = response.data.result;
  
  // Find actual burns (to 0x0 or dead)
  const actualBurns = allTransfers.filter(tx => {
    const to = tx.to.toLowerCase();
    return to === '0x0000000000000000000000000000000000000000' || 
           to === '0x000000000000000000000000000000000000dead';
  });
  
  console.log(`Found ${actualBurns.length} actual burns in block range\n`);
  
  // Compare
  const missing = [];
  const captured = [];
  
  actualBurns.forEach(burn => {
    if (ourBurns.has(burn.hash.toLowerCase())) {
      captured.push(burn);
    } else {
      missing.push(burn);
    }
  });
  
  console.log('═══════════════════════════════════════════');
  console.log('         DETAILED COMPARISON                ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`✅ Captured: ${captured.length} burns`);
  console.log(`❌ Missing: ${missing.length} burns`);
  console.log(`📊 Accuracy: ${(captured.length / actualBurns.length * 100).toFixed(1)}%\n`);
  
  // Analyze missing burns
  if (missing.length > 0) {
    const missingByFrom = {};
    missing.forEach(burn => {
      const from = burn.from.toLowerCase();
      if (!missingByFrom[from]) {
        missingByFrom[from] = {
          count: 0,
          total: 0,
          examples: []
        };
      }
      missingByFrom[from].count++;
      missingByFrom[from].total += parseFloat(burn.value) / 1e18;
      if (missingByFrom[from].examples.length < 2) {
        missingByFrom[from].examples.push({
          hash: burn.hash,
          amount: parseFloat(burn.value) / 1e18,
          to: burn.to
        });
      }
    });
    
    console.log('🔍 Missing burns by source:');
    Object.entries(missingByFrom).forEach(([from, data]) => {
      const label = 
        from === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' ? 'UniversalBuyAndBurn' :
        from === '0x52c1cc79fbbef91d3952ae75b1961d08f0172223' ? 'FarmKeeper' :
        from === '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5' ? 'PeggedFarmKeeper' :
        from.slice(0, 10) + '...';
      
      console.log(`\n  ${label}:`);
      console.log(`    • Missing: ${data.count} burns, ${data.total.toFixed(2)} TINC`);
      data.examples.forEach(ex => {
        const dest = ex.to === '0x0000000000000000000000000000000000000000' ? '0x0' : 'dead';
        console.log(`    • Example: ${ex.hash.slice(0, 10)}... → ${dest}: ${ex.amount.toFixed(2)} TINC`);
      });
    });
    
    // Check if these are in specific blocks
    const missingBlocks = missing.map(b => parseInt(b.blockNumber));
    console.log(`\n📊 Missing burns block distribution:`);
    console.log(`  • Earliest: ${Math.min(...missingBlocks)}`);
    console.log(`  • Latest: ${Math.max(...missingBlocks)}`);
    console.log(`  • Unique blocks: ${new Set(missingBlocks).size}`);
  }
  
  // Check for extra burns we have
  const extraBurns = [];
  ourBurns.forEach((burn, hash) => {
    if (!actualBurns.find(b => b.hash.toLowerCase() === hash)) {
      extraBurns.push(burn);
    }
  });
  
  if (extraBurns.length > 0) {
    console.log(`\n⚠️  Extra burns in our data: ${extraBurns.length}`);
    console.log('These might be from outside our block range or duplicates');
  }
}

preciseMissingAnalysis().catch(console.error);