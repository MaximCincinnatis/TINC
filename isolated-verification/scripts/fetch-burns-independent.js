const fs = require('fs');
const path = require('path');

// Independent burn fetcher - no dependencies on production code
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://eth-mainnet.public.blastapi.io"
];

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';

let currentRPCIndex = 0;

async function callRPC(method, params, retryCount = 0) {
  if (retryCount >= RPC_ENDPOINTS.length * 2) {
    throw new Error('All RPC endpoints exhausted');
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
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }
    
    return data.result;
  } catch (error) {
    console.log(`RPC error with ${endpoint}, trying next...`);
    currentRPCIndex = (currentRPCIndex + 1) % RPC_ENDPOINTS.length;
    return callRPC(method, params, retryCount + 1);
  }
}

async function getCurrentBlock() {
  const blockHex = await callRPC('eth_blockNumber', []);
  return parseInt(blockHex, 16);
}

async function getBlockTimestamp(blockNumber) {
  const block = await callRPC('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, false]);
  return parseInt(block.timestamp, 16);
}

async function fetchBurnsInRange(startBlock, endBlock) {
  console.log(`Fetching burns from block ${startBlock} to ${endBlock}...`);
  
  const logs = await callRPC('eth_getLogs', [{
    fromBlock: `0x${startBlock.toString(16)}`,
    toBlock: `0x${endBlock.toString(16)}`,
    address: TINC_ADDRESS,
    topics: [TRANSFER_TOPIC, null, ZERO_ADDRESS_TOPIC]
  }]);

  const burns = [];
  
  for (const log of logs) {
    const amount = parseInt(log.data, 16) / 1e18;
    const from = '0x' + log.topics[1].slice(26);
    const timestamp = await getBlockTimestamp(parseInt(log.blockNumber, 16));
    
    burns.push({
      hash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      timestamp,
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      from,
      amount,
      logIndex: parseInt(log.logIndex, 16)
    });
  }
  
  return burns;
}

async function fetchLast6Days() {
  console.log('🔍 Independent Burn Verification - Last 6 Days');
  console.log('=' .repeat(50));
  
  const currentBlock = await getCurrentBlock();
  const blocksPerDay = 7200; // ~12 sec per block
  const startBlock = currentBlock - (6 * blocksPerDay);
  
  console.log(`Current block: ${currentBlock}`);
  console.log(`Start block (6 days ago): ${startBlock}`);
  
  const allBurns = [];
  const chunkSize = 800;
  
  for (let block = startBlock; block <= currentBlock; block += chunkSize) {
    const endBlock = Math.min(block + chunkSize - 1, currentBlock);
    
    try {
      const burns = await fetchBurnsInRange(block, endBlock);
      allBurns.push(...burns);
      console.log(`✓ Processed blocks ${block}-${endBlock}: Found ${burns.length} burns`);
    } catch (error) {
      console.error(`❌ Error in blocks ${block}-${endBlock}:`, error.message);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Group by date
  const burnsByDate = {};
  allBurns.forEach(burn => {
    if (!burnsByDate[burn.date]) {
      burnsByDate[burn.date] = {
        date: burn.date,
        burns: [],
        totalAmount: 0,
        transactionCount: 0
      };
    }
    burnsByDate[burn.date].burns.push(burn);
    burnsByDate[burn.date].totalAmount += burn.amount;
    burnsByDate[burn.date].transactionCount++;
  });
  
  // Sort and prepare final data
  const sortedDates = Object.keys(burnsByDate).sort();
  const dailyBurns = sortedDates.map(date => burnsByDate[date]);
  
  const result = {
    verificationDate: new Date().toISOString(),
    method: 'Independent RPC Fetch',
    startBlock,
    endBlock: currentBlock,
    totalBurns: allBurns.length,
    totalAmount: allBurns.reduce((sum, b) => sum + b.amount, 0),
    dailyBurns,
    allTransactions: allBurns
  };
  
  // Save results
  const outputPath = path.join(__dirname, '../data/blockchain-burns.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`Total burns found: ${allBurns.length}`);
  console.log(`Total TINC burned: ${result.totalAmount.toFixed(2)}`);
  console.log(`Days covered: ${dailyBurns.length}`);
  console.log(`\nResults saved to: ${outputPath}`);
  
  return result;
}

// Run if called directly
if (require.main === module) {
  fetchLast6Days().catch(console.error);
}

module.exports = { fetchLast6Days };