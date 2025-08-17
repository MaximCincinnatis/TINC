const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const API_KEY = process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;

// RPC endpoints for total supply
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org"
];

async function callRPC(method, params) {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        })
      });

      const data = await response.json();
      if (!data.error) {
        return data.result;
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}

async function getTotalSupply() {
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  return parseInt(totalSupplyHex, 16) / Math.pow(10, 18);
}

async function fetchAllBurns() {
  const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_ADDRESS}&address=${ZERO_ADDRESS}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  
  console.log('📊 Fetching ALL TINC burns from Etherscan...');
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== '1' || !data.result) {
    throw new Error('Failed to fetch data from Etherscan');
  }
  
  // Filter for actual burns (TO 0x0, not FROM 0x0)
  const burns = data.result.filter(tx => 
    tx.to.toLowerCase() === ZERO_ADDRESS.toLowerCase()
  );
  
  console.log(`✅ Found ${burns.length} total burn transactions`);
  
  // Get last 30 days of burns (fix timestamp comparison)
  const nowSeconds = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = nowSeconds - (30 * 24 * 60 * 60);
  const recentBurns = burns.filter(tx => {
    const txTime = parseInt(tx.timeStamp);
    return txTime >= thirtyDaysAgo;
  });
  
  console.log(`📅 ${recentBurns.length} burns in last 30 days`);
  
  // Debug: Show some recent burns
  if (recentBurns.length > 0) {
    console.log('Recent burns sample:');
    recentBurns.slice(0, 3).forEach(tx => {
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      console.log(`  ${date.toISOString()}: ${(parseFloat(tx.value) / 1e18).toFixed(2)} TINC`);
    });
  }
  
  return { allBurns: burns, recentBurns };
}

async function processBurns(burns) {
  // Group by date
  const burnsByDate = {};
  
  burns.forEach(tx => {
    const date = new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0];
    
    if (!burnsByDate[date]) {
      burnsByDate[date] = {
        date,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      };
    }
    
    const amount = parseFloat(tx.value) / 1e18;
    burnsByDate[date].amountTinc += amount;
    burnsByDate[date].transactionCount++;
    burnsByDate[date].transactions.push({
      hash: tx.hash,
      amount: amount,
      from: tx.from.toLowerCase()
    });
  });
  
  return burnsByDate;
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive burn data fix...\n');
    
    // Fetch all burns
    const { allBurns, recentBurns } = await fetchAllBurns();
    
    // Get total supply
    const totalSupply = await getTotalSupply();
    
    // Process recent burns for daily data
    const burnsByDate = await processBurns(recentBurns);
    
    // Create array of daily burns for last 30 days
    const dailyBurns = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyBurns.push(burnsByDate[dateStr] || {
        date: dateStr,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      });
    }
    
    // Calculate totals
    const totalBurned30d = dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
    const burnPercentage = (totalBurned30d / totalSupply) * 100;
    
    // Calculate all-time burns
    const allTimeBurns = allBurns.reduce((sum, tx) => 
      sum + (parseFloat(tx.value) / 1e18), 0
    );
    
    // Load existing data to preserve holder stats
    let existingData = {};
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    if (fs.existsSync(dataPath)) {
      existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    
    // Create updated data
    const burnData = {
      startDate: dailyBurns[0].date,
      endDate: dailyBurns[dailyBurns.length - 1].date,
      totalBurned: totalBurned30d,
      totalSupply,
      burnPercentage,
      emissionPerSecond: 1.0,
      emissionSamplePeriod: 86400,
      isDeflationary: totalBurned30d > (1.0 * 86400 * 30),
      dailyBurns,
      allTimeBurned: allTimeBurns,
      allTimeBurnCount: allBurns.length,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      dataSource: 'etherscan_complete',
      holderStats: existingData.holderStats || {
        totalHolders: 0,
        poseidon: 0,
        whale: 0,
        shark: 0,
        dolphin: 0,
        squid: 0,
        shrimp: 0,
        top10Percentage: 0
      }
    };
    
    // Write to files
    fs.writeFileSync(dataPath, JSON.stringify(burnData, null, 2));
    
    const publicPath = path.join(__dirname, '../public/data/burn-data.json');
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, JSON.stringify(burnData, null, 2));
    }
    
    console.log('\n✅ BURN DATA SUCCESSFULLY FIXED!');
    console.log('📊 Summary:');
    console.log(`  Total Supply: ${totalSupply.toLocaleString()} TINC`);
    console.log(`  All-Time Burned: ${allTimeBurns.toLocaleString()} TINC (${allBurns.length} txs)`);
    console.log(`  30-Day Burned: ${totalBurned30d.toLocaleString()} TINC`);
    console.log(`  Burn Rate: ${burnPercentage.toFixed(2)}% of supply`);
    console.log(`  Daily Average: ${(totalBurned30d / 30).toLocaleString()} TINC`);
    console.log(`  Deflationary: ${burnData.isDeflationary ? 'Yes ✅' : 'No ❌'}`);
    
    // Show last 7 days
    console.log('\n📅 Last 7 days:');
    dailyBurns.slice(-7).forEach(day => {
      console.log(`  ${day.date}: ${day.amountTinc.toLocaleString()} TINC (${day.transactionCount} txs)`);
    });
    
    // Compare with old data if it exists
    if (existingData.dailyBurns) {
      console.log('\n🔄 Comparison with old data (last 7 days):');
      dailyBurns.slice(-7).forEach(newDay => {
        const oldDay = existingData.dailyBurns?.find(d => d.date === newDay.date);
        if (oldDay) {
          const diff = newDay.amountTinc - oldDay.amountTinc;
          if (Math.abs(diff) > 0.01) {
            console.log(`  ${newDay.date}: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} TINC difference`);
          }
        }
      });
    }
    
    return burnData;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { main };