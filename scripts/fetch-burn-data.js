const fs = require('fs');
const path = require('path');

// RPC endpoints
const RPC_ENDPOINTS = [
  "https://cloudflare-eth.com",
  "https://ethereum.publicnode.com", 
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth"
];

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CHUNK_SIZE = 2000; // blocks per chunk
const AVG_BLOCK_TIME = 12; // seconds

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
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.result;
    } catch (error) {
      console.warn(`RPC error with ${endpoint}:`, error.message);
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
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

async function main() {
  try {
    const burnData = await fetchBurnData();
    
    // Write to data file
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(burnData, null, 2));
    
    console.log('✅ Successfully updated burn data!');
    console.log(`📊 Total Supply: ${burnData.totalSupply.toLocaleString()} TINC`);
    console.log(`🔥 Total Burned: ${burnData.totalBurned.toLocaleString()} TINC`);
    console.log(`⚡ Emission Rate: ${burnData.emissionPerSecond.toFixed(4)} TINC/sec`);
    console.log(`📈 Deflationary: ${burnData.isDeflationary ? 'Yes' : 'No'}`);
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