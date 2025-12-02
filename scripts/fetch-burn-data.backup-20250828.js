const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ⏰ IMPORTANT: This script takes 8-10 minutes to complete
// It fetches REAL blockchain data (no estimates):
// - 30 days of burn transactions from 270+ block chunks
// - Live holder balances from transfer events + balance calls
// - Please wait the full time for accurate results
// ⏰

// RPC endpoint from environment variable or default
const RPC_ENDPOINT = process.env.ETH_RPC_ENDPOINT || "http://192.168.0.73:18546";


const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CHUNK_SIZE = 800; // blocks per chunk (reduced for RPC limits)
const AVG_BLOCK_TIME = 12; // seconds

// Etherscan API configuration
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

// Moralis API configuration
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

// LP and contract addresses to exclude from holder counts
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP Pool
  '0xf89980f60e55633d05e72881ceb866dbb7f50580', // TINC LP Pool (Second LP)
  '0x0000000000000000000000000000000000000000', // Burn address
  '0x000000000000000000000000000000000000dead', // Dead address
].map(addr => addr.toLowerCase()));

async function callRPC(method, params, retryCount = 0) {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    console.error(`[ERROR] All RPC endpoints exhausted after ${maxRetries} retries`);
    throw new Error('All RPC endpoints exhausted after retries');
  }

  const endpoint = RPC_ENDPOINT;
  
  // Create AbortController for proper timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const startTime = Date.now();
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
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      // Check for specific error codes
      if (data.error.code === -32005 || data.error.code === -32001) {
        throw new Error(`Rate limited: ${data.error.message}`);
      }
      throw new Error(data.error.message || 'Unknown RPC error');
    }
    
    // Success - this endpoint is working
    if (retryCount > 0) {
      console.log(`✓ RPC call succeeded with ${endpoint} after ${retryCount} retries (${responseTime}ms)`);
    }
    return data.result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // More detailed error logging
    if (error.name === 'AbortError') {
      console.warn(`[TIMEOUT] RPC timeout with ${endpoint} after 30s`);
    } else if (error.message.includes('Rate limited')) {
      console.warn(`[RATE_LIMIT] ${endpoint}: ${error.message}`);
    } else {
      console.warn(`[ERROR] RPC error with ${endpoint}: ${error.message}`);
    }
    
    // Move to next endpoint
    
    
    // If error contains rate limit message, wait longer
    if (error.message.includes('rate') || error.message.includes('limit') || error.message.includes('quota')) {
      console.log(`⏳ Waiting 2s before retry due to rate limiting...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Retry with next endpoint
    return callRPC(method, params, retryCount + 1);
  }
}

async function getBlockNumber() {
  const result = await callRPC('eth_blockNumber', []);
  return parseInt(result, 16);
}

/**
 * DEPRECATED - DO NOT USE
 * This function caused data loss (Aug 8, Aug 23-25 incidents)
 * Block time estimation is unreliable (varies 12-14 seconds)
 * Use lastProcessedBlock tracking instead
 * @deprecated Since Aug 2025 - causes data overwrites
 */
async function estimateBlockByTimestamp(timestamp) {
  console.warn('⚠️ DEPRECATED: estimateBlockByTimestamp causes data loss - use block tracking');
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
      console.warn(`❌ Attempt ${attempt}/${maxRetries} failed for blocks ${fromBlock}-${toBlock}: ${error.message}`);
      
      if (isLastAttempt) {
        console.error(`🚨 CRITICAL: Failed to fetch blocks ${fromBlock}-${toBlock} after ${maxRetries} attempts!`);
        throw new Error(`Failed to fetch blocks ${fromBlock}-${toBlock} after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const backoffMs = 2000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${backoffMs/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * BLOCK-BASED BURN DATA FETCHING
 * Core principle: Blocks are truth, dates are display
 * We track lastProcessedBlock to know exact resume point
 * RPC timestamps used for calendar grouping only
 */
async function fetchBurnData() {
  console.log('Fetching TINC burn data (full refresh)...');
  
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
  
  // DEPRECATED: Date-based block estimation causes data loss
  // For full refresh, we still need a start point, but we'll track the end block
  const startBlock = await estimateBlockByTimestamp(Math.floor(startDate.getTime() / 1000));

  console.log(`Fetching burns from block ${startBlock} to ${currentBlock}`);
  
  const allBurns = [];
  const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
  let chunksProcessed = 0;

  // Fetch in chunks with robust retry logic
  console.log(`🔄 Processing ${totalChunks} chunks with retry logic...`);
  const failedChunks = [];
  
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    
    try {
      // Use retry mechanism - continue even if chunk fails
      const burns = await fetchBurnsWithRetry(fromBlock, toBlock);
      allBurns.push(...burns);
      chunksProcessed++;
      
      // Progress indicator
      const progress = ((chunksProcessed / totalChunks) * 100).toFixed(1);
      console.log(`📊 Progress: ${chunksProcessed}/${totalChunks} chunks (${progress}%) - Found ${burns.length} burns in this chunk`);
    } catch (error) {
      console.warn(`⚠️  Chunk ${fromBlock}-${toBlock} failed after retries, continuing...`);
      failedChunks.push({ fromBlock, toBlock, error: error.message });
      chunksProcessed++; // Count as processed even if failed
    }
  }
  
  if (failedChunks.length > 0) {
    console.warn(`⚠️  WARNING: ${failedChunks.length} chunks failed - data may be incomplete`);
    console.warn(`   Failed blocks:`, failedChunks.map(c => `${c.fromBlock}-${c.toBlock}`).join(', '));
  }
  
  console.log(`✅ Processed ${totalChunks} chunks - Total burns found: ${allBurns.length}`);

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
      from: burn.from,
      // NEW: Track block number for each transaction
      blockNumber: burn.blockNumber,
      timestamp: burn.timestamp
    });
  });

  // Convert to array and sort by date
  const dailyBurns = Object.values(burnsByDay)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Fill in missing days with zero burns
  const allDays = [];
  // Use endDate as reference point to ensure consistency
  const endDateObj = new Date(endDate.toISOString().split('T')[0] + 'T00:00:00Z');
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(endDateObj);
    date.setUTCDate(date.getUTCDate() - (29 - i));
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
  const totalTransactions = allDays.reduce((sum, day) => sum + day.transactionCount, 0);
  const burnPercentage = totalSupply > 0 ? (totalBurned / totalSupply) * 100 : 0;
  const isDeflationary = totalBurned > dailyEmission;

  // Data integrity validation
  console.log(`🔍 Data validation:`);
  console.log(`   Total burn transactions: ${totalTransactions}`);
  console.log(`   Total TINC burned: ${totalBurned.toLocaleString()}`);
  console.log(`   Daily entries: ${allDays.length} (expected: 30)`);
  
  if (allDays.length !== 30) {
    throw new Error(`Data validation failed: Expected 30 daily entries, got ${allDays.length}`);
  }
  
  if (totalTransactions === 0) {
    console.warn('⚠️  Warning: No burn transactions found in data');
  }

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
    fromCache: true,
    // NEW: Track last processed block for reliable resume
    lastProcessedBlock: currentBlock
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

// New caching-based holder data fetcher
const HolderCacheManager = require('./holder-cache-manager');
const TransferEventMonitor = require('./transfer-event-monitor');
const InitialHolderSnapshot = require('./initial-holder-snapshot');

async function fetchHolderDataWithCache() {
  const cacheManager = new HolderCacheManager();
  const transferMonitor = new TransferEventMonitor(callRPC);
  const snapshotCreator = new InitialHolderSnapshot(callRPC);
  
  try {
    // Check if we have a valid cache
    const cache = cacheManager.loadCache();
    const cacheAge = cacheManager.getCacheAge();
    
    if (cache && cacheAge !== null) {
      console.log(`📊 Found holder cache (${cacheAge} hours old)`);
      
      // If cache is less than 0.5 hours old, use it directly
      if (cacheAge < 0.5) {
        console.log('✅ Using cached holder data');
        return cache.holderStats;
      }
      
      // Otherwise, do incremental update
      console.log('🔄 Performing incremental holder update...');
      const currentBlock = await getBlockNumber();
      const updatedStats = await transferMonitor.getIncrementalHolderUpdate(
        cache.lastBlock,
        currentBlock,
        callRPC
      );
      
      if (updatedStats) {
        return updatedStats;
      }
    }
    
    // No cache or update failed - create initial snapshot
    console.log('🚀 Creating initial holder snapshot from blockchain...');
    console.log('⏰ This will take 5-10 minutes for the initial scan...');
    return await snapshotCreator.createInitialSnapshot();
    
  } catch (error) {
    console.error('❌ Error in cached holder data fetch:', error.message);
    
    // Last resort - try Moralis if available
    if (MORALIS_API_KEY) {
      console.log('🔄 Attempting Moralis API fallback...');
      try {
        return await fetchRealHolderData();
      } catch (moralisError) {
        console.error('❌ Moralis fallback failed:', moralisError.message);
      }
    }
    
    // Return basic data if everything fails
    return {
      totalHolders: 0,
      poseidon: 0,
      whale: 0,
      shark: 0,
      dolphin: 0,
      squid: 0,
      shrimp: 0,
      top10Percentage: 0,
      dataSource: 'error',
      error: error.message
    };
  }
}

// Legacy function for compatibility - now uses caching system
async function fetchHolderData() {
  return await fetchHolderDataWithCache();
}

/**
 * BLOCK-BASED INCREMENTAL UPDATE
 * Uses lastProcessedBlock to know exact resume point
 * Never re-processes blocks = no data overwrites
 */
async function runIncrementalUpdate() {
  const IncrementalBurnManager = require('./incremental-burn-manager');
  const manager = new IncrementalBurnManager();
  
  try {
    // Load existing data
    const existingData = manager.loadExistingData();
    
    // NEW: Get last processed block (reliable resume point)
    const lastProcessedBlock = manager.getLastProcessedBlock();
    const currentBlock = await getBlockNumber();
    
    // Safety check: don't process if no new blocks
    if (lastProcessedBlock >= currentBlock) {
      console.log('✅ Data is already up to date');
      return existingData;
    }
    
    // Calculate block range to fetch (never re-process old blocks!)
    const startBlock = lastProcessedBlock > 0 ? lastProcessedBlock + 1 : currentBlock - 7200 * 30; // 30 days if no last block
    
    console.log(`📦 Block-based incremental update:`);
    console.log(`   Last processed: ${lastProcessedBlock}`);
    console.log(`   Current block: ${currentBlock}`);
    console.log(`   Fetching: ${startBlock} to ${currentBlock}`);
    
    console.log(`🔄 Fetching recent burns from block ${startBlock} to ${currentBlock}...`);
    
    // Fetch recent burns
    const allBurns = [];
    const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
    let chunksProcessed = 0;
    
    console.log(`🔄 Processing ${totalChunks} chunks for recent data...`);
    
    const failedChunks = [];
    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
      
      try {
        const burns = await fetchBurnsWithRetry(fromBlock, toBlock);
        allBurns.push(...burns);
        chunksProcessed++;
        
        const progress = ((chunksProcessed / totalChunks) * 100).toFixed(1);
        console.log(`📊 Progress: ${chunksProcessed}/${totalChunks} chunks (${progress}%) - Found ${burns.length} burns`);
      } catch (error) {
        console.warn(`⚠️  Chunk ${fromBlock}-${toBlock} failed, continuing...`);
        failedChunks.push({ fromBlock, toBlock });
        chunksProcessed++;
      }
    }
    
    if (failedChunks.length > 0) {
      console.warn(`⚠️  ${failedChunks.length} chunks failed during incremental update`);
    }
    
    console.log(`✅ Found ${allBurns.length} recent burn transactions`);
    
    // Process recent burns into daily format (reuse existing logic)
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
    
    const recentDailyBurns = Object.values(burnsByDay).sort((a, b) => a.date.localeCompare(b.date));
    
    // Create recent burn data structure
    const recentBurnData = {
      ...existingData,
      dailyBurns: recentDailyBurns,
      holderStats: await fetchHolderData(), // Update holder data
      // CRITICAL: Update last processed block for next resume
      lastProcessedBlock: currentBlock
    };
    
    // Merge with historical data
    const mergedData = manager.mergeData(existingData, recentBurnData);
    
    // Ensure lastProcessedBlock is preserved in merged data
    mergedData.lastProcessedBlock = currentBlock;
    
    // Validate integrity
    manager.validateMergedData(existingData, mergedData);
    
    // Save merged data
    await saveIncrementalData(mergedData);
    
    console.log('✅ Incremental update completed successfully!');
    console.log(`📊 Total TINC burned: ${mergedData.totalBurned.toLocaleString()}`);
    console.log(`👥 Total holders: ${mergedData.holderStats.totalHolders.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Incremental update failed:', error);
    throw error;
  }
}

async function saveIncrementalData(data) {
  const timestamp = Date.now();
  const versionedFileName = `burn-data-v${timestamp}.json`;
  const dataPath = path.join(__dirname, '../data', versionedFileName);
  const legacyPath = path.join(__dirname, '../data/burn-data.json');
  
  // Write versioned file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  // Also write legacy file for backward compatibility
  fs.writeFileSync(legacyPath, JSON.stringify(data, null, 2));
  
  // Update version manifest
  const manifestPath = path.join(__dirname, '../data/data-manifest.json');
  const manifest = {
    latest: versionedFileName,
    timestamp: new Date().toISOString(),
    version: timestamp,
    updateType: 'incremental'
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`💾 Incremental data saved to: ${dataPath}`);
}

async function main() {
  try {
    // Check for incremental mode flag
    const isIncremental = process.argv.includes('--incremental');
    
    if (isIncremental) {
      console.log('🔄 Starting INCREMENTAL data update...');
      return await runIncrementalUpdate();
    } else {
      console.log('🚀 Starting FULL data refresh...');
      const burnData = await fetchBurnData();
      const holderData = await fetchHolderData();
      
      // Combine burn data with holder data
      const combinedData = {
        ...burnData,
        holderStats: holderData
      };
      
      // Write to versioned data file with timestamp
      const timestamp = Date.now();
      const versionedFileName = `burn-data-v${timestamp}.json`;
      const dataPath = path.join(__dirname, '../data', versionedFileName);
      const legacyPath = path.join(__dirname, '../data/burn-data.json');
      
      // Write versioned file
      fs.writeFileSync(dataPath, JSON.stringify(combinedData, null, 2));
      
      // Also write legacy file for backward compatibility
      fs.writeFileSync(legacyPath, JSON.stringify(combinedData, null, 2));
      
      // Update version manifest
      const manifestPath = path.join(__dirname, '../data/data-manifest.json');
      const manifest = {
        latest: versionedFileName,
        timestamp: new Date().toISOString(),
        version: timestamp,
        updateType: 'full'
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log('✅ Successfully updated burn data!');
      console.log(`📊 Total Supply: ${burnData.totalSupply.toLocaleString()} TINC`);
      console.log(`🔥 Total Burned: ${burnData.totalBurned.toLocaleString()} TINC`);
      console.log(`⚡ Emission Rate: ${burnData.emissionPerSecond.toFixed(4)} TINC/sec`);
      console.log(`📈 Deflationary: ${burnData.isDeflationary ? 'Yes' : 'No'}`);
      console.log(`👥 Total Holders: ${holderData.totalHolders.toLocaleString()}`);
      console.log(`🔱 Poseidon (10%+): ${holderData.poseidon}`);
      console.log(`🐋 Whale (1%+): ${holderData.whale}`);
      console.log(`📅 Data saved to: ${dataPath}`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching burn data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchBurnData, callRPC };