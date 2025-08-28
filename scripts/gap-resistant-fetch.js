require('dotenv').config();
const fs = require('fs');
const path = require('path');
const GapResistantBurnManager = require('./gap-resistant-burn-manager');

// RPC configuration
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org"
];

let currentRPCIndex = 0;

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CHUNK_SIZE = 800;
const AVG_BLOCK_TIME = 12;

/**
 * Gap-Resistant Fetch System
 * Prevents gaps during incremental updates
 */
class GapResistantFetch {
  constructor() {
    this.manager = new GapResistantBurnManager();
    this.dataPath = path.join(__dirname, '../public/data/burn-data.json');
    this.rangesPath = path.join(__dirname, '../data/processed-ranges.json');
  }

  async callRPC(method, params, retryCount = 0) {
    if (retryCount >= RPC_ENDPOINTS.length * 2) {
      throw new Error('All RPC endpoints exhausted');
    }

    const endpoint = RPC_ENDPOINTS[currentRPCIndex];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.callRPC(method, params, retryCount + 1);
    }
  }

  async getBlockNumber() {
    const blockHex = await this.callRPC('eth_blockNumber', []);
    return parseInt(blockHex, 16);
  }

  async getBlockTimestamp(blockNumber) {
    const block = await this.callRPC('eth_getBlockByNumber', [
      `0x${blockNumber.toString(16)}`,
      false
    ]);
    return parseInt(block.timestamp, 16);
  }

  async fetchBurns(fromBlock, toBlock) {
    const logs = await this.callRPC('eth_getLogs', [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      address: TINC_ADDRESS,
      topics: [
        TRANSFER_TOPIC,
        null,
        ZERO_ADDRESS_TOPIC
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

  async fetchWithGapProtection(startBlock, endBlock) {
    console.log(`\n🛡️  Gap-Protected Fetch: ${startBlock} to ${endBlock}`);
    
    const processedChunks = [];
    const failedChunks = [];
    const allBurns = [];
    
    // Process in chunks
    for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, endBlock);
      
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          process.stdout.write(`  📦 Chunk ${fromBlock}-${toBlock}... `);
          const burns = await this.fetchBurns(fromBlock, toBlock);
          
          allBurns.push(...burns);
          processedChunks.push({ start: fromBlock, end: toBlock });
          console.log(`✅ ${burns.length} burns`);
          success = true;
          break;
        } catch (error) {
          if (attempt === 3) {
            console.log(`❌ Failed`);
            failedChunks.push({ start: fromBlock, end: toBlock });
          } else {
            process.stdout.write('retry... ');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }
    
    return {
      burns: allBurns,
      processedChunks,
      failedChunks
    };
  }

  async runGapResistantUpdate() {
    console.log('🚀 Starting Gap-Resistant Update\n');
    
    // 1. Load current state
    const rangeData = this.manager.loadProcessedRanges();
    
    // 2. Detect gaps
    const gaps = this.manager.detectGaps(rangeData.ranges);
    if (gaps.length > 0) {
      console.log(`⚠️  Detected ${gaps.length} gaps - will backfill first\n`);
      
      // Backfill top 2 gaps
      const topGaps = gaps.sort((a, b) => b.size - a.size).slice(0, 2);
      for (const gap of topGaps) {
        const result = await this.fetchWithGapProtection(gap.start, gap.end);
        if (result.burns.length > 0) {
          console.log(`  💰 Recovered ${result.burns.length} burns from gap`);
        }
        
        // Update ranges even if no burns found
        rangeData.ranges = this.manager.addProcessedRange(
          rangeData.ranges,
          gap.start,
          gap.end
        );
      }
    }
    
    // 3. Process new blocks
    const currentBlock = await this.getBlockNumber();
    const lastProcessedBlock = rangeData.ranges.length > 0 
      ? Math.max(...rangeData.ranges.map(r => r.end))
      : currentBlock - (7200 * 30); // 30 days if no history
    
    if (currentBlock > lastProcessedBlock) {
      console.log(`\n📊 Processing new blocks: ${lastProcessedBlock + 1} to ${currentBlock}`);
      
      const result = await this.fetchWithGapProtection(lastProcessedBlock + 1, currentBlock);
      
      // Update ranges with successfully processed chunks
      result.processedChunks.forEach(chunk => {
        rangeData.ranges = this.manager.addProcessedRange(
          rangeData.ranges,
          chunk.start,
          chunk.end
        );
      });
      
      // Log failed chunks as new gaps
      if (result.failedChunks.length > 0) {
        console.log(`\n⚠️  ${result.failedChunks.length} chunks failed - will retry next run`);
        result.failedChunks.forEach(chunk => {
          console.log(`  • Failed: ${chunk.start}-${chunk.end}`);
        });
      }
      
      console.log(`\n✅ Found ${result.burns.length} new burns`);
    } else {
      console.log('\n✅ Already up to date');
    }
    
    // 4. Validate integrity
    const issues = this.manager.validateIntegrity(rangeData, {});
    if (issues.length > 0) {
      console.log('\n🔍 Integrity Check:');
      issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${issue.message}`);
      });
    }
    
    // 5. Save updated ranges
    this.manager.saveProcessedRanges(rangeData);
    
    // 6. Generate report
    const report = this.manager.generateReport(rangeData, issues);
    
    console.log('\n✅ Update complete with gap protection');
    
    return {
      ranges: rangeData.ranges,
      gaps: report.gaps,
      issues: report.issues
    };
  }
}

// Run if called directly
if (require.main === module) {
  const fetcher = new GapResistantFetch();
  fetcher.runGapResistantUpdate().catch(console.error);
}

module.exports = GapResistantFetch;