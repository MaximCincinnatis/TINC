const fs = require('fs');
const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const UNIVERSAL_BUY_AND_BURN = '0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3';
const FARMKEEPER = '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223';
const PEGGED_FARMKEEPER = '0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

const BURN_ADDRESSES = [
  UNIVERSAL_BUY_AND_BURN.toLowerCase(),
  FARMKEEPER.toLowerCase(),
  PEGGED_FARMKEEPER.toLowerCase(),
  '0x000000000000000000000000000000000000dead'
];

async function fetchEtherscanBurns(startBlock, endBlock) {
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_TOKEN}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    if (response.data.status === '1') {
      return response.data.result.filter(tx => 
        BURN_ADDRESSES.includes(tx.to.toLowerCase())
      );
    }
    return [];
  } catch (error) {
    console.error('Error fetching from Etherscan:', error.message);
    return [];
  }
}

async function getBlockForDate(targetDate) {
  // Estimate block based on ~12 second block time
  const currentBlock = 23200000; // Approximate current block
  const currentTime = Math.floor(Date.now() / 1000);
  const targetTime = Math.floor(new Date(targetDate).getTime() / 1000);
  const blockDiff = Math.floor((currentTime - targetTime) / 12);
  return currentBlock - blockDiff;
}

async function loadRecordedBurns() {
  const dataPath = '/home/wsl/projects/TINC/public/data/burn-data.json';
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Flatten all transactions from daily burns
  const recordedTxs = new Map();
  data.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      recordedTxs.set(tx.hash.toLowerCase(), {
        ...tx,
        date: day.date
      });
    });
  });
  
  return recordedTxs;
}

async function analyzeDiscrepancies() {
  console.log('🔍 Red Team Burn Verification Starting...\n');
  
  // Load our recorded burns
  const recordedBurns = await loadRecordedBurns();
  console.log(`📊 Recorded burns in our database: ${recordedBurns.size}`);
  
  // Fetch actual burns from Etherscan (Aug 15 to today)
  const startBlock = await getBlockForDate('2025-08-15');
  const endBlock = 'latest';
  
  console.log(`\n🔗 Fetching on-chain data from block ${startBlock} to ${endBlock}...`);
  const onChainBurns = await fetchEtherscanBurns(startBlock, endBlock);
  
  console.log(`📊 Actual burns on-chain: ${onChainBurns.length}\n`);
  
  // Compare and find missing burns
  const missingBurns = [];
  const extraBurns = [];
  const onChainMap = new Map();
  
  onChainBurns.forEach(tx => {
    const hash = tx.hash.toLowerCase();
    onChainMap.set(hash, tx);
    
    if (!recordedBurns.has(hash)) {
      missingBurns.push({
        hash: tx.hash,
        amount: parseFloat(tx.value) / 1e18,
        to: tx.to,
        from: tx.from,
        blockNumber: parseInt(tx.blockNumber),
        timestamp: parseInt(tx.timeStamp),
        date: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0]
      });
    }
  });
  
  // Check for burns we have that aren't on chain
  recordedBurns.forEach((burn, hash) => {
    if (!onChainMap.has(hash)) {
      extraBurns.push(burn);
    }
  });
  
  // Generate report
  console.log('═══════════════════════════════════════════');
  console.log('           RED TEAM ANALYSIS REPORT         ');
  console.log('═══════════════════════════════════════════\n');
  
  if (missingBurns.length > 0) {
    console.log(`❌ MISSING BURNS: ${missingBurns.length} burns not in our database\n`);
    
    // Group by date
    const byDate = {};
    missingBurns.forEach(burn => {
      if (!byDate[burn.date]) byDate[burn.date] = [];
      byDate[burn.date].push(burn);
    });
    
    Object.entries(byDate).sort().forEach(([date, burns]) => {
      const total = burns.reduce((sum, b) => sum + b.amount, 0);
      console.log(`  📅 ${date}: ${burns.length} burns, ${total.toFixed(2)} TINC`);
      burns.forEach(burn => {
        console.log(`     • ${burn.hash.slice(0, 10)}... - ${burn.amount.toFixed(2)} TINC`);
        console.log(`       To: ${burn.to}`);
      });
    });
  } else {
    console.log('✅ No missing burns detected');
  }
  
  if (extraBurns.length > 0) {
    console.log(`\n⚠️  EXTRA BURNS: ${extraBurns.length} burns in database but not on chain`);
    extraBurns.forEach(burn => {
      console.log(`  • ${burn.hash.slice(0, 10)}... - ${burn.amount} TINC`);
    });
  }
  
  // Analysis summary
  console.log('\n═══════════════════════════════════════════');
  console.log('              ANALYSIS SUMMARY              ');
  console.log('═══════════════════════════════════════════\n');
  
  const totalMissingAmount = missingBurns.reduce((sum, b) => sum + b.amount, 0);
  console.log(`📊 Database Accuracy: ${((1 - missingBurns.length / onChainBurns.length) * 100).toFixed(1)}%`);
  console.log(`💰 Missing TINC Amount: ${totalMissingAmount.toFixed(2)} TINC`);
  
  if (missingBurns.length > 0) {
    // Analyze patterns
    const missingByAddress = {};
    missingBurns.forEach(burn => {
      if (!missingByAddress[burn.to]) missingByAddress[burn.to] = 0;
      missingByAddress[burn.to]++;
    });
    
    console.log('\n🔍 Missing Burns by Destination:');
    Object.entries(missingByAddress).forEach(([addr, count]) => {
      console.log(`  • ${addr}: ${count} burns`);
    });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    recordedCount: recordedBurns.size,
    onChainCount: onChainBurns.length,
    missingCount: missingBurns.length,
    extraCount: extraBurns.length,
    accuracy: ((1 - missingBurns.length / onChainBurns.length) * 100).toFixed(1) + '%',
    missingBurns,
    extraBurns
  };
  
  fs.writeFileSync(
    '/home/wsl/projects/TINC/tasks/red-team-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Detailed report saved to tasks/red-team-report.json');
  
  return report;
}

// Run the analysis
analyzeDiscrepancies().catch(console.error);