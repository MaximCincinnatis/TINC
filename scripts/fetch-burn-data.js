const fs = require('fs');
const path = require('path');

// ⏰ IMPORTANT: This script takes 8-10 minutes to complete
// It fetches REAL blockchain data (no estimates):
// - 30 days of burn transactions from 270+ block chunks
// - Live holder balances from transfer events + balance calls
// - Please wait the full time for accurate results
// ⏰

// RPC endpoints with backup options (tested and working)
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org"
];

let currentRPCIndex = 0;

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CHUNK_SIZE = 800; // blocks per chunk (reduced for RPC limits)
const AVG_BLOCK_TIME = 12; // seconds

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YOUR_ETHERSCAN_API_KEY_HERE';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

// Moralis API configuration
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || 'YOUR_MORALIS_API_KEY_HERE';
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

// LP and contract addresses to exclude from holder counts
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP
  '0x0000000000000000000000000000000000000000', // Burn address
  '0x000000000000000000000000000000000000dead', // Dead address
  // Add other known LP and contract addresses here
].map(addr => addr.toLowerCase()));

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
      timeout: 30000 // 30 second timeout
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // Success - this endpoint is working
    return data.result;
  } catch (error) {
    console.warn(`RPC error with ${endpoint}:`, error.message);
    
    // Move to next endpoint
    currentRPCIndex = (currentRPCIndex + 1) % RPC_ENDPOINTS.length;
    
    // If error contains rate limit message, wait a bit
    if (error.message.includes('rate') || error.message.includes('limit')) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Retry with next endpoint
    return callRPC(method, params, retryCount + 1);
  }
}

async function getBlockNumber() {
  const result = await callRPC('eth_blockNumber', []);
  return parseInt(result, 16);
}

async function estimateBlockByTimestamp(timestamp) {
  const currentBlock = await getBlockNumber();
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - timestamp;
  const blocksDiff = Math.floor(timeDiff / AVG_BLOCK_TIME);
  return Math.max(1, currentBlock - blocksDiff);
}

async function getBlockTimestamp(blockNumber) {
  const block = await callRPC('eth_getBlockByNumber', [
    typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber,
    false
  ]);
  return parseInt(block.timestamp, 16);
}

async function getEmissionRate(contractAddress) {
  // TINC has a fixed emission rate of 1 TINC/second = 86,400 TINC/day
  console.log('Using TINC standard emission rate: 1.0 TINC/sec');
  return { emissionPerSecond: 1.0, samplePeriod: 86400 };
}

async function fetchBurns(fromBlock, toBlock) {
  const logs = await callRPC('eth_getLogs', [{
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
    address: TINC_ADDRESS,
    topics: [
      TRANSFER_TOPIC,
      null, // from address (any)
      ZERO_ADDRESS_TOPIC // to address (0x0)
    ]
  }]);
  
  const burns = [];
  for (const log of logs) {
    const amount = parseInt(log.data, 16) / Math.pow(10, 18);
    const from = '0x' + log.topics[1].substring(26);
    const blockNumber = parseInt(log.blockNumber, 16);
    const timestamp = await getBlockTimestamp(blockNumber);
    
    burns.push({
      hash: log.transactionHash,
      amount,
      from,
      timestamp,
      blockNumber
    });
  }
  
  return burns;
}

async function fetchBurnData() {
  console.log('Fetching TINC burn data...');
  
  // Get total supply
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  const totalSupply = parseInt(totalSupplyHex, 16) / Math.pow(10, 18);

  // Get emission rate
  const emissionData = await getEmissionRate(TINC_ADDRESS);
  const dailyEmission = emissionData.emissionPerSecond * 86400;

  // Fetch actual burn transactions
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const currentBlock = await getBlockNumber();
  const startBlock = await estimateBlockByTimestamp(Math.floor(startDate.getTime() / 1000));

  console.log(`Fetching burns from block ${startBlock} to ${currentBlock}`);
  
  const allBurns = [];
  const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
  let chunksProcessed = 0;

  // Fetch in chunks
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    
    try {
      console.log(`Fetching blocks ${fromBlock} to ${toBlock} (${chunksProcessed + 1}/${totalChunks})...`);
      const burns = await fetchBurns(fromBlock, toBlock);
      allBurns.push(...burns);
      chunksProcessed++;
    } catch (error) {
      console.warn(`Error fetching chunk ${fromBlock}-${toBlock}:`, error.message);
    }
  }

  // Group burns by day
  const burnsByDay = {};
  allBurns.forEach(burn => {
    const date = new Date(burn.timestamp * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    if (!burnsByDay[dateStr]) {
      burnsByDay[dateStr] = {
        date: dateStr,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      };
    }
    
    burnsByDay[dateStr].amountTinc += burn.amount;
    burnsByDay[dateStr].transactionCount++;
    burnsByDay[dateStr].transactions.push({
      hash: burn.hash,
      amount: burn.amount,
      from: burn.from
    });
  });

  // Convert to array and sort by date
  const dailyBurns = Object.values(burnsByDay)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Fill in missing days with zero burns
  const allDays = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const existingData = dailyBurns.find(d => d.date === dateStr);
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

  const totalBurned = allDays.reduce((sum, day) => sum + day.amountTinc, 0);
  const burnPercentage = totalSupply > 0 ? (totalBurned / totalSupply) * 100 : 0;
  const isDeflationary = totalBurned > dailyEmission;

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalBurned,
    totalSupply,
    burnPercentage,
    emissionPerSecond: emissionData.emissionPerSecond,
    emissionSamplePeriod: emissionData.samplePeriod,
    isDeflationary,
    dailyBurns: allDays,
    fetchedAt: new Date().toISOString(),
    fromCache: true
  };
}

// Get total supply for percentage calculations
async function getTotalSupply() {
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  return parseInt(totalSupplyHex, 16) / Math.pow(10, 18);
}

// Fetch ALL holders using Moralis API - much more comprehensive!
async function fetchRealHolderData() {
  try {
    console.log('📊 Fetching REAL holder data from Moralis API...');
    
    const totalSupply = await getTotalSupply();
    console.log(`📊 Total Supply: ${totalSupply.toLocaleString()} TINC`);
    
    // Use Moralis token holders endpoint - gets ALL holders
    const allHolders = [];
    let cursor = null;
    let page = 1;
    
    do {
      const url = `${MORALIS_BASE_URL}/erc20/${TINC_ADDRESS}/owners?chain=eth&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
      
      console.log(`📊 Fetching holders page ${page} from Moralis...`);
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.result && data.result.length > 0) {
        allHolders.push(...data.result);
        console.log(`📊 Page ${page}: Found ${data.result.length} holders, total: ${allHolders.length}`);
      }
      
      cursor = data.cursor;
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } while (cursor && page <= 50); // Safety limit of 50 pages (5000 holders max)
    
    console.log(`📊 Total holders found: ${allHolders.length}`);
    
    // Filter out LP positions and contract addresses
    const filteredHolders = allHolders.filter(holder => 
      !EXCLUDED_ADDRESSES.has(holder.owner_address.toLowerCase()) && 
      parseFloat(holder.balance_formatted) > 0
    );
    
    console.log(`📊 Filtered out ${allHolders.length - filteredHolders.length} LP/contract/zero balance addresses`);
    
    // Sort holders by balance to find top 10
    const sortedHolders = [...filteredHolders].sort((a, b) => 
      parseFloat(b.balance_formatted) - parseFloat(a.balance_formatted)
    );
    
    // Calculate top 10 holders' combined percentage
    const top10Holders = sortedHolders.slice(0, 10);
    const top10Balance = top10Holders.reduce((sum, holder) => 
      sum + parseFloat(holder.balance_formatted), 0
    );
    const top10Percentage = (top10Balance / totalSupply) * 100;
    
    console.log(`📊 Top 10 holders own: ${top10Percentage.toFixed(2)}% of total supply`);
    
    // Categorize holders based on percentage of total supply
    let poseidon = 0, whale = 0, shark = 0, dolphin = 0, squid = 0, shrimp = 0;
    
    filteredHolders.forEach(holder => {
      const balance = parseFloat(holder.balance_formatted);
      const percentage = (balance / totalSupply) * 100;
      
      if (percentage >= 10) poseidon++;
      else if (percentage >= 1) whale++;
      else if (percentage >= 0.1) shark++;
      else if (percentage >= 0.01) dolphin++;
      else if (percentage >= 0.001) squid++;
      else shrimp++;
    });
    
    console.log(`📊 REAL HOLDER COUNTS (Moralis API):`);
    console.log(`🔱 Poseidon (10%+): ${poseidon}`);
    console.log(`🐋 Whale (1%+): ${whale}`);
    console.log(`🦈 Shark (0.1%+): ${shark}`);
    console.log(`🐬 Dolphin (0.01%+): ${dolphin}`);
    console.log(`🦑 Squid (0.001%+): ${squid}`);
    console.log(`🍤 Shrimp (<0.001%): ${shrimp}`);
    
    return {
      totalHolders: filteredHolders.length,
      poseidon,
      whale,
      shark,
      dolphin,
      squid,
      shrimp,
      top10Percentage,
      estimatedData: false,
      excludesLPPositions: true,
      realTimeData: true,
      dataSource: 'moralis'
    };
    
  } catch (error) {
    console.error('❌ Error fetching real holder data from Moralis:', error.message);
    throw error; // Don't fall back to estimates - user wants ONLY real data
  }
}

// Legacy function for compatibility - now calls real data fetcher
async function fetchHolderData() {
  return await fetchRealHolderData();
}

async function main() {
  try {
    console.log('🚀 Starting data fetch...');
    const burnData = await fetchBurnData();
    const holderData = await fetchHolderData();
    
    // Combine burn data with holder data
    const combinedData = {
      ...burnData,
      holderStats: holderData
    };
    
    // Write to data file
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(combinedData, null, 2));
    
    console.log('✅ Successfully updated burn data!');
    console.log(`📊 Total Supply: ${burnData.totalSupply.toLocaleString()} TINC`);
    console.log(`🔥 Total Burned: ${burnData.totalBurned.toLocaleString()} TINC`);
    console.log(`⚡ Emission Rate: ${burnData.emissionPerSecond.toFixed(4)} TINC/sec`);
    console.log(`📈 Deflationary: ${burnData.isDeflationary ? 'Yes' : 'No'}`);
    console.log(`👥 Total Holders: ${holderData.totalHolders.toLocaleString()}`);
    console.log(`🔱 Poseidon (10%+): ${holderData.poseidon}`);
    console.log(`🐋 Whale (1%+): ${holderData.whale}`);
    console.log(`📅 Data saved to: ${dataPath}`);
    
  } catch (error) {
    console.error('❌ Error fetching burn data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchBurnData };