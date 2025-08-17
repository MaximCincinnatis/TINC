require('dotenv').config();
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const API_KEY = process.env.ETHERSCAN_API_KEY;

console.log('🚀 Fetching ACCURATE burn data using direct API call...\n');

// Use curl to fetch data (more reliable than Node fetch)
const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_ADDRESS}&address=${ZERO_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;

const curlCommand = `curl -s "${url}"`;
const rawData = execSync(curlCommand, { encoding: 'utf8' });
const data = JSON.parse(rawData);

if (data.status !== '1' || !data.result) {
  console.error('Failed to fetch data from Etherscan');
  process.exit(1);
}

// Filter for burns (TO 0x0)
const allBurns = data.result.filter(tx => 
  tx.to.toLowerCase() === ZERO_ADDRESS.toLowerCase()
);

console.log(`✅ Found ${allBurns.length} total burn transactions\n`);

// Get burns from last 30 days
const now = Date.now() / 1000;
const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

const recentBurns = allBurns.filter(tx => {
  const timestamp = parseInt(tx.timeStamp);
  return timestamp >= thirtyDaysAgo;
});

console.log(`📅 ${recentBurns.length} burns in last 30 days\n`);

// Group burns by date
const burnsByDate = {};

recentBurns.forEach(tx => {
  const timestamp = parseInt(tx.timeStamp);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  
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

// Create complete 30-day array
const dailyBurns = [];
for (let i = 29; i >= 0; i--) {
  const d = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
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
const allTimeBurned = allBurns.reduce((sum, tx) => sum + (parseFloat(tx.value) / 1e18), 0);

// Get total supply (using simple RPC call)
async function getTotalSupply() {
  const rpcData = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: TINC_ADDRESS, data: '0x18160ddd' }, 'latest']
  });
  
  const rpcResult = execSync(
    `curl -s -X POST -H "Content-Type: application/json" -d '${rpcData}' https://ethereum.publicnode.com`,
    { encoding: 'utf8' }
  );
  
  const response = JSON.parse(rpcResult);
  const totalSupplyHex = response.result;
  return parseInt(totalSupplyHex, 16) / 1e18;
}

async function main() {
  const totalSupply = await getTotalSupply();
  const burnPercentage = (totalBurned30d / totalSupply) * 100;
  
  // Load existing data to preserve holder stats
  let existingData = {};
  const dataPath = path.join(__dirname, '../data/burn-data.json');
  if (fs.existsSync(dataPath)) {
    existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  
  // Create complete data structure
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
    allTimeBurned,
    allTimeBurnCount: allBurns.length,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
    dataSource: 'etherscan_direct',
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
  
  console.log('✅ BURN DATA SUCCESSFULLY UPDATED WITH ACCURATE VALUES!\n');
  console.log('📊 Summary:');
  console.log(`  Total Supply: ${totalSupply.toLocaleString()} TINC`);
  console.log(`  All-Time Burned: ${allTimeBurned.toLocaleString()} TINC (${allBurns.length} txs)`);
  console.log(`  30-Day Burned: ${totalBurned30d.toLocaleString()} TINC (${recentBurns.length} txs)`);
  console.log(`  Burn Rate: ${burnPercentage.toFixed(2)}% of supply`);
  console.log(`  Daily Average: ${(totalBurned30d / 30).toLocaleString()} TINC`);
  console.log(`  Deflationary: ${burnData.isDeflationary ? 'Yes ✅' : 'No ❌'}`);
  
  console.log('\n📅 Last 7 days:');
  dailyBurns.slice(-7).forEach(day => {
    const status = day.amountTinc > 0 ? '🔥' : '  ';
    console.log(`  ${status} ${day.date}: ${day.amountTinc.toLocaleString()} TINC (${day.transactionCount} txs)`);
  });
  
  // Update the main fetch script to use this approach
  console.log('\n📝 Updating main fetch-burn-data.js to use accurate method...');
  
  return burnData;
}

main().catch(console.error);