const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function checkBurnDestinations() {
  console.log('🔍 Checking actual burn destinations\n');
  
  // Get burns from UniversalBuyAndBurn from last few days
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3&contractaddress=${TINC_TOKEN}&startblock=23230000&endblock=latest&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
  
  const response = await axios.get(url);
  
  if (response.data.status !== '1') {
    console.log('Error fetching data');
    return;
  }
  
  const transfers = response.data.result;
  
  // Separate incoming and outgoing
  const incoming = [];
  const outgoing = [];
  
  transfers.forEach(tx => {
    const isIncoming = tx.to.toLowerCase() === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3';
    
    if (isIncoming) {
      incoming.push({
        hash: tx.hash,
        from: tx.from,
        amount: parseFloat(tx.value) / 1e18,
        block: tx.blockNumber
      });
    } else {
      outgoing.push({
        hash: tx.hash,
        to: tx.to,
        amount: parseFloat(tx.value) / 1e18,
        block: tx.blockNumber
      });
    }
  });
  
  console.log('═══════════════════════════════════════════');
  console.log('    UniversalBuyAndBurn Analysis           ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`📥 Incoming transfers: ${incoming.length}`);
  console.log(`📤 Outgoing transfers: ${outgoing.length}\n`);
  
  // Check where UniversalBuyAndBurn sends tokens
  const destinations = {};
  outgoing.forEach(tx => {
    const dest = tx.to.toLowerCase();
    if (!destinations[dest]) {
      destinations[dest] = {
        count: 0,
        total: 0
      };
    }
    destinations[dest].count++;
    destinations[dest].total += tx.amount;
  });
  
  console.log('🎯 Where UniversalBuyAndBurn sends TINC:');
  Object.entries(destinations).forEach(([addr, data]) => {
    const label = 
      addr === '0x0000000000000000000000000000000000000000' ? '0x0 (BURN)' :
      addr === '0x000000000000000000000000000000000000dead' ? 'dead (BURN)' :
      addr;
    console.log(`  • ${label}`);
    console.log(`    Count: ${data.count}, Total: ${data.total.toFixed(2)} TINC`);
  });
  
  // Check incoming amounts vs outgoing
  const totalIn = incoming.reduce((sum, tx) => sum + tx.amount, 0);
  const totalOut = outgoing.reduce((sum, tx) => sum + tx.amount, 0);
  
  console.log(`\n💰 Flow Analysis:`);
  console.log(`  Total In:  ${totalIn.toFixed(2)} TINC`);
  console.log(`  Total Out: ${totalOut.toFixed(2)} TINC`);
  console.log(`  Balance:   ${(totalIn - totalOut).toFixed(2)} TINC`);
  
  // Sample transactions
  console.log('\n📋 Recent burns from UniversalBuyAndBurn:');
  outgoing.filter(tx => 
    tx.to === '0x0000000000000000000000000000000000000000' || 
    tx.to === '0x000000000000000000000000000000000000dead'
  ).slice(0, 5).forEach(tx => {
    const dest = tx.to === '0x0000000000000000000000000000000000000000' ? '0x0' : 'dead';
    console.log(`  • ${tx.hash.slice(0, 10)}... → ${dest}: ${tx.amount.toFixed(2)} TINC (block ${tx.block})`);
  });
}

checkBurnDestinations().catch(console.error);