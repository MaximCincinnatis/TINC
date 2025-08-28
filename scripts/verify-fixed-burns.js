const fs = require('fs');
const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

const BURN_ADDRESSES = [
  '0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3',
  '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223', 
  '0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5',
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead'
].map(a => a.toLowerCase());

async function fetchRecentBurns() {
  // Get burns from last 5 days for quick test
  const startBlock = 23200000;
  const endBlock = 'latest';
  
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  const response = await axios.get(url);
  if (response.data.status === '1') {
    return response.data.result.filter(tx => 
      BURN_ADDRESSES.includes(tx.to.toLowerCase())
    );
  }
  return [];
}

async function verifyFixed() {
  console.log('🔍 Quick Verification of Fixed Script\n');
  
  // Check if fixed data exists
  const fixedPath = '/home/wsl/projects/TINC/public/data/burn-data-fixed.json';
  const oldPath = '/home/wsl/projects/TINC/public/data/burn-data.json';
  
  if (!fs.existsSync(fixedPath)) {
    console.log('⏳ Fixed data not ready yet. Run the fixed script first.');
    return;
  }
  
  const fixedData = JSON.parse(fs.readFileSync(fixedPath, 'utf8'));
  const oldData = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
  
  // Get recent on-chain burns for comparison
  console.log('Fetching recent on-chain burns...');
  const onChainBurns = await fetchRecentBurns();
  
  // Count burns in fixed vs old
  let fixedBurnCount = 0;
  let oldBurnCount = 0;
  
  fixedData.dailyBurns.forEach(day => {
    fixedBurnCount += day.transactions.length;
  });
  
  oldData.dailyBurns.forEach(day => {
    oldBurnCount += day.transactions.length;
  });
  
  console.log('═══════════════════════════════════════════');
  console.log('         VERIFICATION RESULTS               ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log('📊 Burn Count Comparison:');
  console.log(`  Old Script:   ${oldBurnCount} burns`);
  console.log(`  Fixed Script: ${fixedBurnCount} burns`);
  console.log(`  Improvement:  ${((fixedBurnCount / oldBurnCount - 1) * 100).toFixed(1)}% increase\n`);
  
  console.log('💰 Total TINC Burned:');
  console.log(`  Old Script:   ${oldData.totalBurned.toFixed(2)} TINC`);
  console.log(`  Fixed Script: ${fixedData.totalBurned.toFixed(2)} TINC`);
  console.log(`  Difference:   ${(fixedData.totalBurned - oldData.totalBurned).toFixed(2)} TINC\n`);
  
  // Check burn addresses captured
  const burnDestinations = new Set();
  fixedData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      if (tx.to) burnDestinations.add(tx.to);
    });
  });
  
  console.log('🎯 Burn Addresses Captured:');
  burnDestinations.forEach(addr => {
    const label = 
      addr === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' ? 'UniversalBuyAndBurn' :
      addr === '0x52c1cc79fbbef91d3952ae75b1961d08f0172223' ? 'FarmKeeper' :
      addr === '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5' ? 'PeggedFarmKeeper' :
      addr === '0x000000000000000000000000000000000000dead' ? 'Dead' : 'Zero';
    console.log(`  ✅ ${label}`);
  });
  
  // Sample verification
  console.log('\n📋 Recent Burns Sample (last 5):');
  const recentFixed = fixedData.dailyBurns[fixedData.dailyBurns.length - 1]?.transactions.slice(-5) || [];
  recentFixed.forEach(burn => {
    console.log(`  • ${burn.hash.slice(0, 10)}... - ${burn.amount.toFixed(2)} TINC to ${burn.to.slice(0, 10)}...`);
  });
  
  // Estimate accuracy
  const recentOnChainCount = onChainBurns.length;
  console.log(`\n🎯 Recent Period Accuracy Check:`);
  console.log(`  On-chain burns (last ~5 days): ${recentOnChainCount}`);
  
  if (fixedBurnCount > oldBurnCount * 2) {
    console.log('\n✅ SUCCESS: Fixed script captures significantly more burns!');
  } else if (fixedBurnCount > oldBurnCount) {
    console.log('\n⚠️  PARTIAL: Fixed script shows improvement but may need more time.');
  } else {
    console.log('\n❌ ERROR: Fixed script not showing expected improvement.');
  }
}

verifyFixed().catch(console.error);