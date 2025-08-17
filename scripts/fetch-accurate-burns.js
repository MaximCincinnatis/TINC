const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const API_KEY = process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;

// RPC endpoints for direct blockchain queries
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org"
];

let currentRPCIndex = 0;

async function callRPC(method, params, retryCount = 0) {
  const maxRetries = RPC_ENDPOINTS.length * 2;
  
  if (retryCount >= maxRetries) {
    throw new Error('All RPC endpoints exhausted after retries');
  }

  const endpoint = RPC_ENDPOINTS[currentRPCIndex];
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      timeout: 30000
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.result;
  } catch (error) {
    console.warn(`RPC error with ${endpoint}:`, error.message);
    currentRPCIndex = (currentRPCIndex + 1) % RPC_ENDPOINTS.length;
    
    if (error.message.includes('rate') || error.message.includes('limit')) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return callRPC(method, params, retryCount + 1);
  }
}

async function getTotalSupply() {
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  return parseInt(totalSupplyHex, 16) / Math.pow(10, 18);
}

async function fetchBurnsFromEtherscan(days = 30) {
  return new Promise((resolve, reject) => {
    const fromTimestamp = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_ADDRESS}&address=${ZERO_ADDRESS}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
    
    console.log(`📊 Fetching ALL TINC burns from Etherscan (last ${days} days)...`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === '1' && result.result) {
            // IMPORTANT: Filter for burns (TO 0x0) not mints (FROM 0x0)
            // Also filter to requested time period
            const recentBurns = result.result.filter(tx => 
              tx.to.toLowerCase() === ZERO_ADDRESS.toLowerCase() && 
              parseInt(tx.timeStamp) >= fromTimestamp
            );
            console.log(`✅ Found ${recentBurns.length} burn transactions in last ${days} days`);
            
            // Group by date
            const burnsByDate = {};
            recentBurns.forEach(tx => {
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
            
            // Convert to sorted array
            const dailyBurns = Object.values(burnsByDate)
              .sort((a, b) => a.date.localeCompare(b.date));
            
            // Fill in missing days with zero burns
            const allDays = [];
            const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            const endDate = new Date();
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const existingData = dailyBurns.find(day => day.date === dateStr);
              
              if (existingData) {
                allDays.push(existingData);
              } else {
                allDays.push({
                  date: dateStr,
                  amountTinc: 0,
                  transactionCount: 0,
                  transactions: []
                });
              }
            }
            
            resolve(allDays);
          } else {
            reject(new Error(`Etherscan API error: ${result.message || 'Unknown error'}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function updateBurnData() {
  try {
    console.log('🚀 Starting accurate burn data fetch...\n');
    
    // Get burns from Etherscan (most accurate source)
    const dailyBurns = await fetchBurnsFromEtherscan(30);
    
    // Get total supply for calculations
    const totalSupply = await getTotalSupply();
    
    // Calculate totals
    const totalBurned = dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
    const burnPercentage = (totalBurned / totalSupply) * 100;
    
    // Load existing data to preserve holder stats
    let existingData = {};
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    if (fs.existsSync(dataPath)) {
      existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    
    // Create updated data structure
    const burnData = {
      startDate: dailyBurns[0].date,
      endDate: dailyBurns[dailyBurns.length - 1].date,
      totalBurned,
      totalSupply,
      burnPercentage,
      emissionPerSecond: 1.0, // TINC fixed emission rate
      emissionSamplePeriod: 86400,
      isDeflationary: totalBurned > (1.0 * 86400 * 30), // Compare to 30-day emission
      dailyBurns,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      dataSource: 'etherscan_accurate',
      // Preserve holder stats if they exist
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
    
    // Write updated data
    fs.writeFileSync(dataPath, JSON.stringify(burnData, null, 2));
    
    // Also update public data
    const publicPath = path.join(__dirname, '../public/data/burn-data.json');
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, JSON.stringify(burnData, null, 2));
    }
    
    console.log('\n✅ Successfully updated burn data with ACCURATE values!');
    console.log('📊 Summary:');
    console.log(`  Total Supply: ${totalSupply.toLocaleString()} TINC`);
    console.log(`  Total Burned (30d): ${totalBurned.toLocaleString()} TINC`);
    console.log(`  Burn Percentage: ${burnPercentage.toFixed(2)}%`);
    console.log(`  Daily Average: ${(totalBurned / 30).toLocaleString()} TINC`);
    console.log(`  Deflationary: ${burnData.isDeflationary ? 'Yes ✅' : 'No ❌'}`);
    
    // Show last 7 days
    console.log('\n📅 Last 7 days:');
    dailyBurns.slice(-7).forEach(day => {
      console.log(`  ${day.date}: ${day.amountTinc.toLocaleString()} TINC (${day.transactionCount} txs)`);
    });
    
    return burnData;
    
  } catch (error) {
    console.error('❌ Error updating burn data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateBurnData()
    .then(() => {
      console.log('\n✅ Burn data successfully updated!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to update burn data:', error);
      process.exit(1);
    });
}

module.exports = { updateBurnData, fetchBurnsFromEtherscan };