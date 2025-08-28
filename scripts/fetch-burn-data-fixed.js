const fs = require('fs');
const path = require('path');
require('dotenv').config();

// RPC endpoints with backup options
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org",
  "https://rpc.payy.moe",
  "https://eth.merkle.io",
  "https://ethereum-rpc.publicnode.com"
];

let currentRPCIndex = 0;

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const CHUNK_SIZE = 800;
const AVG_BLOCK_TIME = 12;

// CRITICAL FIX: Include ALL burn addresses
const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000', // Zero address
  '0x000000000000000000000000000000000000dead', // Dead address  
  '0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3', // UniversalBuyAndBurn
  '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223', // FarmKeeper
  '0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5'  // PeggedFarmKeeper
].map(addr => addr.toLowerCase());

// Convert addresses to topic format for filtering
function addressToTopic(address) {
  return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
}

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

// Moralis API configuration
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

// LP and contract addresses to exclude from holder counts
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3',
  '0xf89980f60e55633d05e72881ceb866dbb7f50580',
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
].map(addr => addr.toLowerCase()));

async function callRPC(method, params, retryCount = 0) {
  const maxRetries = RPC_ENDPOINTS.length * 2;
  
  if (retryCount >= maxRetries) {
    console.error(`[ERROR] All RPC endpoints exhausted after ${maxRetries} retries`);
    throw new Error('All RPC endpoints exhausted after retries');
  }

  const endpoint = RPC_ENDPOINTS[currentRPCIndex];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'TINC-Burn-Tracker/1.0'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      if (data.error.code === -32005 || data.error.code === -32001) {
        throw new Error(`Rate limited: ${data.error.message}`);
      }
      throw new Error(data.error.message || 'Unknown RPC error');
    }
    
    return data.result;
  } catch (error) {
    clearTimeout(timeoutId);
    currentRPCIndex = (currentRPCIndex + 1) % RPC_ENDPOINTS.length;
    
    if (error.name === 'AbortError') {
      console.warn(`[RPC] Timeout on ${endpoint}, rotating to next endpoint...`);
    } else {
      console.warn(`[RPC] Error on ${endpoint}: ${error.message}, rotating...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    return callRPC(method, params, retryCount + 1);
  }
}

async function getBlockNumber() {
  const blockHex = await callRPC('eth_blockNumber', []);
  return parseInt(blockHex, 16);
}

async function getBlockTimestamp(blockNumber) {
  const block = await callRPC('eth_getBlockByNumber', [
    `0x${blockNumber.toString(16)}`,
    false
  ]);
  return parseInt(block.timestamp, 16);
}

async function estimateBlockByTimestamp(targetTimestamp) {
  const currentBlock = await getBlockNumber();
  const currentTimestamp = await getBlockTimestamp(currentBlock);
  const blockDiff = Math.floor((currentTimestamp - targetTimestamp) / AVG_BLOCK_TIME);
  return Math.max(1, currentBlock - blockDiff);
}

// FIXED: Fetch burns to ALL burn addresses
async function fetchBurns(fromBlock, toBlock) {
  const allBurns = [];
  
  // Fetch burns for each burn address
  for (const burnAddress of BURN_ADDRESSES) {
    try {
      const logs = await callRPC('eth_getLogs', [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        address: TINC_ADDRESS,
        topics: [
          TRANSFER_TOPIC,
          null, // from address (any)
          addressToTopic(burnAddress) // to specific burn address
        ]
      }]);
      
      for (const log of logs) {
        const amount = parseInt(log.data, 16) / Math.pow(10, 18);
        const from = '0x' + log.topics[1].substring(26);
        const blockNumber = parseInt(log.blockNumber, 16);
        const timestamp = await getBlockTimestamp(blockNumber);
        
        allBurns.push({
          hash: log.transactionHash,
          amount,
          from,
          to: burnAddress, // Track which burn address received it
          blockNumber,
          timestamp
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch burns for ${burnAddress}: ${error.message}`);
    }
  }
  
  return allBurns;
}

async function fetchBurnsWithRetry(fromBlock, toBlock, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching blocks ${fromBlock} to ${toBlock} (attempt ${attempt}/${maxRetries})...`);
      const burns = await fetchBurns(fromBlock, toBlock);
      if (attempt > 1) {
        console.log(`✅ Success on attempt ${attempt} for blocks ${fromBlock}-${toBlock}`);
      }
      return burns;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.warn(`❌ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (isLastAttempt) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      const backoffMs = 2000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${backoffMs/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

async function getEmissionRate(tokenAddress) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `${ETHERSCAN_BASE_URL}?module=stats&action=tokensupply&contractaddress=${tokenAddress}&apikey=${ETHERSCAN_API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (data.status === '1') {
      return {
        emissionPerSecond: 1,
        emissionSamplePeriod: 86400
      };
    }
  } catch (error) {
    console.warn('Failed to fetch emission rate:', error.message);
  }
  
  return {
    emissionPerSecond: 1,
    emissionSamplePeriod: 86400
  };
}

async function fetchHolders(tokenAddress) {
  if (!MORALIS_API_KEY) {
    console.log('⚠️  Moralis API key not configured - using estimate for holder count');
    return { count: 2800, isEstimate: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(
      `${MORALIS_BASE_URL}/erc20/${tokenAddress}/owners?chain=eth&limit=100`,
      {
        headers: { 'X-API-Key': MORALIS_API_KEY },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }
    
    const data = await response.json();
    const totalHolders = data.total || 0;
    
    const filteredHolders = data.result?.filter(holder => 
      !EXCLUDED_ADDRESSES.has(holder.owner_address.toLowerCase())
    ).length || 0;
    
    const estimatedTotal = Math.floor(totalHolders * (filteredHolders / (data.result?.length || 1)));
    
    return { 
      count: estimatedTotal > 0 ? estimatedTotal : 2800,
      isEstimate: false 
    };
  } catch (error) {
    console.warn('Failed to fetch holders from Moralis:', error.message);
    return { count: 2800, isEstimate: true };
  }
}

async function fetchBurnData() {
  console.log('🔍 Fetching TINC burn data (FIXED VERSION - All burn addresses)...');
  
  // Get total supply
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  const totalSupply = parseInt(totalSupplyHex, 16) / Math.pow(10, 18);

  // Get emission rate
  const emissionData = await getEmissionRate(TINC_ADDRESS);
  const dailyEmission = emissionData.emissionPerSecond * 86400;

  // Fetch burn transactions
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const currentBlock = await getBlockNumber();
  const startBlock = await estimateBlockByTimestamp(Math.floor(startDate.getTime() / 1000));

  console.log(`📋 Monitoring burn addresses:`);
  BURN_ADDRESSES.forEach(addr => {
    const label = 
      addr === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' ? 'UniversalBuyAndBurn' :
      addr === '0x52c1cc79fbbef91d3952ae75b1961d08f0172223' ? 'FarmKeeper' :
      addr === '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5' ? 'PeggedFarmKeeper' :
      addr === '0x000000000000000000000000000000000000dead' ? 'Dead Address' :
      'Zero Address';
    console.log(`   • ${addr} (${label})`);
  });
  
  console.log(`\n🔄 Fetching burns from block ${startBlock} to ${currentBlock}`);
  
  const allBurns = [];
  const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
  let chunksProcessed = 0;

  console.log(`📦 Processing ${totalChunks} chunks...`);
  const failedChunks = [];
  
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    
    try {
      const burns = await fetchBurnsWithRetry(fromBlock, toBlock);
      allBurns.push(...burns);
      chunksProcessed++;
      
      const progress = ((chunksProcessed / totalChunks) * 100).toFixed(1);
      console.log(`📊 Progress: ${chunksProcessed}/${totalChunks} (${progress}%) - Found ${burns.length} burns`);
    } catch (error) {
      console.warn(`⚠️  Chunk ${fromBlock}-${toBlock} failed, continuing...`);
      failedChunks.push({ fromBlock, toBlock });
      chunksProcessed++;
    }
  }
  
  if (failedChunks.length > 0) {
    console.warn(`\n⚠️  WARNING: ${failedChunks.length} chunks failed`);
  }
  
  console.log(`\n✅ Found ${allBurns.length} total burns across all addresses`);
  
  // Show breakdown by burn address
  const burnsByAddress = {};
  allBurns.forEach(burn => {
    if (!burnsByAddress[burn.to]) burnsByAddress[burn.to] = 0;
    burnsByAddress[burn.to]++;
  });
  
  console.log('\n📊 Burns by destination:');
  Object.entries(burnsByAddress).forEach(([addr, count]) => {
    const label = 
      addr === '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' ? 'UniversalBuyAndBurn' :
      addr === '0x52c1cc79fbbef91d3952ae75b1961d08f0172223' ? 'FarmKeeper' :
      addr === '0x619095a53ed0d1058db530ccc04ab5a1c2ef0cd5' ? 'PeggedFarmKeeper' :
      addr === '0x000000000000000000000000000000000000dead' ? 'Dead' : 'Zero';
    console.log(`   • ${label}: ${count} burns`);
  });

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
    burnsByDay[dateStr].transactions.push(burn);
  });

  // Convert to array and sort
  const dailyBurns = Object.values(burnsByDay).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  // Calculate totals
  const totalBurned = allBurns.reduce((sum, burn) => sum + burn.amount, 0);
  const burnPercentage = (totalBurned / totalSupply) * 100;

  // Get holder count
  const holderData = await fetchHolders(TINC_ADDRESS);

  // Prepare final data
  const burnData = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalBurned,
    totalSupply,
    burnPercentage,
    emissionPerSecond: emissionData.emissionPerSecond,
    emissionSamplePeriod: emissionData.emissionSamplePeriod,
    isDeflationary: totalBurned > dailyEmission * 30,
    dailyBurns,
    lastProcessedBlock: currentBlock,
    burnAddresses: BURN_ADDRESSES,
    holderCount: holderData.count,
    holderCountIsEstimate: holderData.isEstimate,
    timestamp: Date.now()
  };

  // Save data
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filename = path.join(dataDir, 'burn-data-fixed.json');
  fs.writeFileSync(filename, JSON.stringify(burnData, null, 2));
  
  console.log('\n✅ Burn data saved to burn-data-fixed.json');
  console.log(`📈 Total burned: ${totalBurned.toFixed(2)} TINC (${burnPercentage.toFixed(2)}%)`);
  console.log(`👥 Holders: ${holderData.count}${holderData.isEstimate ? ' (estimate)' : ''}`);
  
  return burnData;
}

// Run if called directly
if (require.main === module) {
  fetchBurnData().catch(console.error);
}

module.exports = { fetchBurnData };