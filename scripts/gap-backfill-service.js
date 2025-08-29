require('dotenv').config();
const fs = require('fs');
const path = require('path');
const GapResistantBurnManager = require('./gap-resistant-burn-manager');

// RPC endpoints
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org"
];

let currentRPCIndex = 0;

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CHUNK_SIZE = 400; // Smaller chunks for backfill

/**
 * Gap Backfill Service
 * Automatically detects and fills gaps in burn data
 */
class GapBackfillService {
  constructor() {
    this.manager = new GapResistantBurnManager();
    this.dataPath = path.join(__dirname, '../data/burn-data.json');
    this.backfillLogPath = path.join(__dirname, '../data/backfill-log.json');
  }

  async callRPC(method, params, retryCount = 0) {
    if (retryCount >= RPC_ENDPOINTS.length * 2) {
      throw new Error('All RPC endpoints exhausted');
    }

    const endpoint = RPC_ENDPOINTS[currentRPCIndex];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
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
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      currentRPCIndex = (currentRPCIndex + 1) % RPC_ENDPOINTS.length;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.callRPC(method, params, retryCount + 1);
    }
  }

  async getBlockTimestamp(blockNumber) {
    const block = await this.callRPC('eth_getBlockByNumber', [
      `0x${blockNumber.toString(16)}`,
      false
    ]);
    return parseInt(block.timestamp, 16);
  }

  async fetchBurnsInRange(fromBlock, toBlock) {
    const logs = await this.callRPC('eth_getLogs', [{
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
      const timestamp = await this.getBlockTimestamp(blockNumber);
      
      burns.push({
        hash: log.transactionHash,
        amount,
        from,
        blockNumber,
        timestamp
      });
    }
    
    return burns;
  }

  async backfillGap(gap, maxRetries = 3) {
    console.log(`\n🔧 Backfilling gap: ${gap.start} to ${gap.end} (${gap.size} blocks)`);
    
    const allBurns = [];
    let successfulChunks = 0;
    let failedChunks = [];
    
    // Process in smaller chunks
    for (let fromBlock = gap.start; fromBlock <= gap.end; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, gap.end);
      
      let success = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          process.stdout.write(`  📦 Chunk ${fromBlock}-${toBlock} (attempt ${attempt})... `);
          const burns = await this.fetchBurnsInRange(fromBlock, toBlock);
          allBurns.push(...burns);
          successfulChunks++;
          console.log(`✅ Found ${burns.length} burns`);
          success = true;
          break;
        } catch (error) {
          if (attempt === maxRetries) {
            console.log(`❌ Failed after ${maxRetries} attempts`);
            failedChunks.push({ from: fromBlock, to: toBlock });
          } else {
            process.stdout.write('retry... ');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!success) {
        console.log(`  ⚠️  Failed chunk will be retried later`);
      }
    }
    
    return {
      burns: allBurns,
      successfulChunks,
      failedChunks,
      totalBurned: allBurns.reduce((sum, b) => sum + b.amount, 0)
    };
  }

  mergeBurnsIntoData(existingData, newBurns) {
    // Group new burns by date
    const burnsByDate = {};
    newBurns.forEach(burn => {
      const date = new Date(burn.timestamp * 1000).toISOString().split('T')[0];
      if (!burnsByDate[date]) {
        burnsByDate[date] = [];
      }
      burnsByDate[date].push(burn);
    });
    
    // Merge with existing daily burns
    const dailyBurnsMap = new Map();
    existingData.dailyBurns.forEach(day => {
      dailyBurnsMap.set(day.date, day);
    });
    
    // Add new burns
    Object.entries(burnsByDate).forEach(([date, burns]) => {
      if (dailyBurnsMap.has(date)) {
        // Merge with existing day
        const existingDay = dailyBurnsMap.get(date);
        const existingHashes = new Set(existingDay.transactions.map(t => t.hash));
        
        // Add only new burns (no duplicates)
        burns.forEach(burn => {
          if (!existingHashes.has(burn.hash)) {
            existingDay.transactions.push(burn);
            existingDay.amountTinc += burn.amount;
            existingDay.transactionCount++;
          }
        });
      } else {
        // Create new day
        dailyBurnsMap.set(date, {
          date,
          amountTinc: burns.reduce((sum, b) => sum + b.amount, 0),
          transactionCount: burns.length,
          transactions: burns
        });
      }
    });
    
    // Convert back to array and sort
    existingData.dailyBurns = Array.from(dailyBurnsMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Update totals
    existingData.totalBurned = existingData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
    
    return existingData;
  }

  async backfillAllGaps(maxGaps = 5) {
    console.log('🚀 Starting Gap Backfill Service\n');
    
    // Load current state
    const rangeData = this.manager.loadProcessedRanges();
    const gaps = this.manager.detectGaps(rangeData.ranges);
    
    if (gaps.length === 0) {
      console.log('✅ No gaps to backfill!');
      return;
    }
    
    // Load existing burn data
    const burnData = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
    
    console.log(`📊 Found ${gaps.length} gaps to backfill`);
    console.log(`🎯 Processing top ${Math.min(maxGaps, gaps.length)} gaps\n`);
    
    // Sort by size and take top N
    const gapsToProcess = gaps
      .sort((a, b) => b.size - a.size)
      .slice(0, maxGaps);
    
    const backfillLog = {
      timestamp: new Date().toISOString(),
      gapsProcessed: [],
      totalBurnsFound: 0,
      totalTincRecovered: 0
    };
    
    // Process each gap
    for (const gap of gapsToProcess) {
      const result = await this.backfillGap(gap);
      
      // Always update ranges to mark gap as processed
      rangeData.ranges = this.manager.addProcessedRange(
        rangeData.ranges,
        gap.start,
        gap.end
      );
      
      if (result.burns.length > 0) {
        // Merge burns into data
        this.mergeBurnsIntoData(burnData, result.burns);
        console.log(`  💰 Recovered ${result.totalBurned.toFixed(2)} TINC from ${result.burns.length} burns`);
      } else {
        console.log(`  ℹ️  No burns found in this gap (blocks processed successfully)`);
      }
      
      backfillLog.gapsProcessed.push({
        gap,
        burnsFound: result.burns.length,
        tincRecovered: result.totalBurned,
        failedChunks: result.failedChunks
      });
      
      backfillLog.totalBurnsFound += result.burns.length;
      backfillLog.totalTincRecovered += result.totalBurned;
    }
    
    // Save updated data
    console.log('\n💾 Saving updated data...');
    
    // Update burn data
    burnData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.dataPath, JSON.stringify(burnData, null, 2));
    
    // Save range data
    this.manager.saveProcessedRanges(rangeData);
    
    // Save backfill log
    fs.writeFileSync(this.backfillLogPath, JSON.stringify(backfillLog, null, 2));
    
    // Final report
    console.log('\n════════════════════════════════════════════');
    console.log('         BACKFILL COMPLETE                  ');
    console.log('════════════════════════════════════════════\n');
    console.log(`✅ Processed ${backfillLog.gapsProcessed.length} gaps`);
    console.log(`🔥 Recovered ${backfillLog.totalBurnsFound} burns`);
    console.log(`💰 Total TINC recovered: ${backfillLog.totalTincRecovered.toFixed(2)}`);
    
    // Check remaining gaps
    const remainingGaps = this.manager.detectGaps(rangeData.ranges);
    console.log(`\n📊 Remaining gaps: ${remainingGaps.length}`);
    
    if (remainingGaps.length > 0) {
      console.log('   Run again to process more gaps');
    }
    
    return backfillLog;
  }
}

// Run if called directly
if (require.main === module) {
  const service = new GapBackfillService();
  service.backfillAllGaps(3).catch(console.error); // Process 3 gaps at a time
}

module.exports = GapBackfillService;