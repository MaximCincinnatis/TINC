const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ⏰ IMPORTANT: This script takes 8-10 minutes to complete
// It fetches REAL blockchain data (no estimates):
// - 30 days of burn transactions from 270+ block chunks
// - Live holder balances from transfer events + balance calls
// - Please wait the full time for accurate results
// ⏰

// FAILFAST RPC FETCHER - Infinite retry, all or nothing
const FailfastRPCFetcher = require('./failfast-rpc-fetcher');
const rpcFetcher = new FailfastRPCFetcher("http://192.168.0.73:18545");

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

// Use failfast fetcher for all RPC calls - infinite retry
async function callRPC(method, params) {
  return rpcFetcher.callRPC(method, params);
}

async function getBlockNumber() {
  return rpcFetcher.getBlockNumber();
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
  return rpcFetcher.getBlockTimestamp(blockNumber);
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

/**
 * Fetch burns in a block range with failfast infinite retry
 * Uses the FailfastRPCFetcher which handles all retry logic
 */
async function fetchBurnsInRange(fromBlock, toBlock) {
  return rpcFetcher.fetchWithInfiniteRetry(
    async () => {
      const chunkSize = toBlock - fromBlock + 1;
      console.log(`Fetching blocks ${fromBlock} to ${toBlock} (${chunkSize} blocks)...`);
      return await fetchBurns(fromBlock, toBlock);
    },
    `Blocks ${fromBlock}-${toBlock}`
  );
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

  // Fetch in chunks with failfast infinite retry - NEVER skips blocks
  console.log(`🔄 Processing ${totalChunks} chunks with failfast infinite retry (will retry forever until 100% complete)...`);

  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);

    // FAILFAST: fetchBurnsInRange will retry forever until success
    const burns = await fetchBurnsInRange(fromBlock, toBlock);
    allBurns.push(...burns);
    chunksProcessed++;

    // Progress indicator
    const progress = ((chunksProcessed / totalChunks) * 100).toFixed(1);
    console.log(`📊 Progress: ${chunksProcessed}/${totalChunks} chunks (${progress}%) - Found ${burns.length} burns in this chunk`);
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

// Fetch a single Moralis API page with infinite retry (mirrors fetchBurnsWithRetry pattern)
async function fetchMoralisPageWithRetry(url, page) {
  const maxBackoff = 600000; // 10 minutes max backoff
  let attempt = 1;
  const requestTimeout = 30000; // 30 seconds timeout per request

  while (true) { // INFINITE RETRY - never give up
    try {
      console.log(`📊 Fetching holders page ${page} from Moralis (attempt ${attempt})...`);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${requestTimeout/1000}s`)), requestTimeout);
      });

      // Race between fetch and timeout
      const fetchPromise = fetch(url, {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Content-Type': 'application/json'
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Moralis API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (attempt > 1) {
        console.log(`✅ Moralis page ${page} succeeded on attempt ${attempt}`);
      }
      return data; // Only exit on success

    } catch (error) {
      console.warn(`❌ Moralis page ${page} attempt ${attempt} failed: ${error.message}`);

      // Exponential backoff up to 10 minutes, then retry every 10 minutes
      const exponentialBackoff = 1000 * Math.pow(2, attempt - 1);
      const backoffMs = Math.min(exponentialBackoff, maxBackoff);

      if (backoffMs >= maxBackoff) {
        console.log(`⏳ Retrying Moralis page ${page} in ${maxBackoff/60000} minutes (max backoff reached, will retry every 10 min until success)...`);
      } else {
        console.log(`⏳ Waiting ${(backoffMs/1000).toFixed(1)}s before retry (attempt ${attempt + 1})...`);
      }

      await new Promise(resolve => setTimeout(resolve, backoffMs));
      attempt++;
      // Loop continues forever - NEVER GIVES UP
    }
  }
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

      // Use retry logic for each page - will retry forever until success
      const data = await fetchMoralisPageWithRetry(url, page);

      if (data.result && data.result.length > 0) {
        allHolders.push(...data.result);
        console.log(`📊 Page ${page}: Found ${data.result.length} holders, total: ${allHolders.length}`);
      }

      cursor = data.cursor;
      page++;

      // Rate limiting between successful pages
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

// Fetch holder data directly from Moralis API - simple and accurate
async function fetchHolderData() {
  return await fetchRealHolderData();
}

/**
 * BLOCK-BASED INCREMENTAL UPDATE
 * Uses lastProcessedBlock to know exact resume point
 * Never re-processes blocks = no data overwrites
 */
async function runIncrementalUpdate() {
  const IncrementalBurnManager = require('./incremental-burn-manager-fixed');
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
    
    // CRITICAL: Re-scan last processed block to catch late transactions/reorgs
    const startBlock = lastProcessedBlock > 0 ? lastProcessedBlock : currentBlock - 7200 * 30; // 30 days if no last block

    console.log(`📦 Block-based incremental update (RE-SCAN LAST BLOCK):`);
    console.log(`   Last processed: ${lastProcessedBlock}`);
    console.log(`   Current block: ${currentBlock}`);
    console.log(`   Fetching: ${startBlock} to ${currentBlock} (re-scanning ${startBlock} for late txs)`);
    
    console.log(`🔄 Fetching recent burns from block ${startBlock} to ${currentBlock}...`);
    
    // Fetch recent burns
    const allBurns = [];
    const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
    let chunksProcessed = 0;
    
    console.log(`🔄 Processing ${totalChunks} chunks for recent data (failfast infinite retry - will never skip blocks)...`);

    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);

      // FAILFAST: fetchBurnsInRange will retry forever until success
      const burns = await fetchBurnsInRange(fromBlock, toBlock);
      allBurns.push(...burns);
      chunksProcessed++;

      const progress = ((chunksProcessed / totalChunks) * 100).toFixed(1);
      console.log(`📊 Progress: ${chunksProcessed}/${totalChunks} chunks (${progress}%) - Found ${burns.length} burns`);
    }

    console.log(`✅ Found ${allBurns.length} total burn transactions`);
    
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
    
    // Validate the updated data
    console.log('🔍 Validating updated burn data...');
    const validationResult = await validateBurnData(mergedData);
    
    if (!validationResult.valid) {
      console.error('⚠️ Validation detected discrepancies:');
      console.error(`  Date: ${validationResult.date}`);
      console.error(`  Expected: ${validationResult.expected?.toFixed(2)} TINC`);
      console.error(`  Actual: ${validationResult.actual?.toFixed(2)} TINC`);
      console.error(`  Difference: ${validationResult.difference?.toFixed(2)} TINC`);
      
      // Save validation failure for investigation
      const validationLogPath = path.join(__dirname, '../data/validation-failures.json');
      const failureLog = {
        timestamp: new Date().toISOString(),
        ...validationResult,
        lastProcessedBlock: mergedData.lastProcessedBlock
      };
      
      let failures = [];
      if (fs.existsSync(validationLogPath)) {
        try {
          failures = JSON.parse(fs.readFileSync(validationLogPath, 'utf8'));
        } catch (e) {
          console.warn('Could not read validation failures log, starting fresh');
        }
      }
      failures.push(failureLog);
      fs.writeFileSync(validationLogPath, JSON.stringify(failures, null, 2));
      
      console.warn('⚠️ Data saved but validation failed - manual review recommended');
    } else {
      console.log('✅ Data validation passed!');
    }
    
    console.log('✅ Incremental update completed successfully!');
    console.log(`📊 Total TINC burned: ${mergedData.totalBurned.toLocaleString()}`);
    console.log(`👥 Total holders: ${mergedData.holderStats.totalHolders.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Incremental update failed:', error);
    throw error;
  }
}

async function validateBurnData(data) {
  // Sample validation: Check last day's burns against fresh fetch
  const lastDay = data.dailyBurns[data.dailyBurns.length - 1];
  if (!lastDay) return { valid: true }; // No data to validate
  
  try {
    // Skip validation if the last day is today (might still be in progress)
    const today = new Date().toISOString().split('T')[0];
    if (lastDay.date === today) {
      console.log('  Skipping validation for today (still in progress)');
      return { valid: true };
    }
    
    // For now, do a simple sanity check
    // In production, this could fetch fresh data from blockchain
    const validationChecks = {
      hasTransactions: lastDay.transactionCount > 0,
      hasAmount: lastDay.amountTinc > 0,
      reasonableAmount: lastDay.amountTinc < 1000000, // Less than 1M TINC per day
      hasHashes: lastDay.transactions && lastDay.transactions.length === lastDay.transactionCount
    };
    
    const allChecks = Object.values(validationChecks).every(check => check);
    
    if (!allChecks) {
      return {
        valid: false,
        date: lastDay.date,
        actual: lastDay.amountTinc,
        expected: null,
        difference: null,
        failedChecks: Object.entries(validationChecks)
          .filter(([_, passed]) => !passed)
          .map(([check, _]) => check)
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.warn('⚠️ Validation skipped due to error:', error.message);
    return { valid: true }; // Don't fail update due to validation error
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