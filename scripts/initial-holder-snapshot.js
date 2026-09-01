require('dotenv').config();
const HolderCacheManager = require('./holder-cache-manager');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEPLOYMENT_BLOCK = 20900000; // Verified 2026-09-01: first TINC Transfer events are in blocks 2092xxxx (eth_getCode at 19M returned 0x); margin kept below that

// LP and contract addresses to exclude
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP Pool
  '0xf89980f60e55633d05e72881ceb866dbb7f50580', // TINC LP Pool (Second LP)
  '0x0000000000000000000000000000000000000000', // Burn address
  '0x000000000000000000000000000000000000dead', // Dead address
].map(addr => addr.toLowerCase()));

class InitialHolderSnapshot {
  constructor(rpcCall) {
    this.rpcCall = rpcCall;
    this.cacheManager = new HolderCacheManager();
  }

  async getAllHoldersFromEvents(fromBlock, toBlock) {
    console.log('🔍 Building holder list from Transfer events...');
    console.log(`  Scanning blocks ${fromBlock} to ${toBlock}`);
    
    const holders = new Map(); // address -> {received, sent}
    const CHUNK_SIZE = 10000;
    let currentFrom = fromBlock;
    let totalEvents = 0;
    
    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + CHUNK_SIZE - 1, toBlock);
      
      try {
        const logs = await this.rpcCall('eth_getLogs', [{
          fromBlock: `0x${currentFrom.toString(16)}`,
          toBlock: `0x${currentTo.toString(16)}`,
          address: TINC_ADDRESS,
          topics: [TRANSFER_TOPIC]
        }]);
        
        logs.forEach(log => {
          const from = '0x' + log.topics[1].substring(26);
          const to = '0x' + log.topics[2].substring(26);
          const value = parseInt(log.data, 16) / Math.pow(10, 18);
          
          // Track token movements
          if (from !== ZERO_ADDRESS) {
            const fromData = holders.get(from.toLowerCase()) || { received: 0, sent: 0 };
            fromData.sent += value;
            holders.set(from.toLowerCase(), fromData);
          }
          
          if (to !== ZERO_ADDRESS) {
            const toData = holders.get(to.toLowerCase()) || { received: 0, sent: 0 };
            toData.received += value;
            holders.set(to.toLowerCase(), toData);
          }
        });
        
        totalEvents += logs.length;
        console.log(`  ✅ Processed blocks ${currentFrom}-${currentTo}: ${logs.length} transfers (total: ${totalEvents})`);
        
      } catch (error) {
        console.warn(`  ⚠️ Error fetching chunk ${currentFrom}-${currentTo}:`, error.message);
      }
      
      currentFrom = currentTo + 1;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Filter to addresses that should have positive balance
    const potentialHolders = [];
    for (const [address, data] of holders.entries()) {
      const estimatedBalance = data.received - data.sent;
      // Dust threshold unified with transfer-event-monitor's 0.000001 (2026-09-01):
      // the snapshot previously cut at 0.01 while incrementals cut at 1e-6, so dust
      // wallets re-entered on activity and totalHolders drifted between the two.
      if (estimatedBalance > 0.000001 && !EXCLUDED_ADDRESSES.has(address)) {
        potentialHolders.push(address);
      }
    }
    
    console.log(`📊 Found ${potentialHolders.length} potential holders from ${totalEvents} transfer events`);
    return potentialHolders;
  }

  async getActualBalances(addresses) {
    console.log(`🔍 Checking actual balances for ${addresses.length} addresses...`);
    
    const holders = [];
    const batchSize = 50;
    let checkedCount = 0;
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(async (address) => {
        try {
          const balanceHex = await this.rpcCall('eth_call', [
            {
              to: TINC_ADDRESS,
              data: '0x70a08231' + address.substring(2).padStart(64, '0') // balanceOf(address)
            },
            'latest'
          ]);
          
          const balance = parseInt(balanceHex, 16) / Math.pow(10, 18);
          if (balance > 0.000001) { // same dust threshold as incremental updates
            return { address, balance };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to get balance for ${address}:`, error.message);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      const validHolders = results.filter(r => r !== null);
      holders.push(...validHolders);
      
      checkedCount += batch.length;
      console.log(`  ✅ Checked ${checkedCount}/${addresses.length} addresses, found ${holders.length} holders`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return holders;
  }

  async createInitialSnapshot() {
    try {
      // Get current block and total supply
      const currentBlockHex = await this.rpcCall('eth_blockNumber', []);
      const currentBlock = parseInt(currentBlockHex, 16);
      
      const totalSupplyHex = await this.rpcCall('eth_call', [
        { to: TINC_ADDRESS, data: '0x18160ddd' },
        'latest'
      ]);
      const totalSupply = parseInt(totalSupplyHex, 16) / Math.pow(10, 18);
      
      console.log(`📊 Current block: ${currentBlock}`);
      console.log(`📊 Total supply: ${totalSupply.toLocaleString()} TINC`);
      
      // Get all potential holders from events
      const potentialHolders = await this.getAllHoldersFromEvents(DEPLOYMENT_BLOCK, currentBlock);
      
      // Get actual balances
      const holders = await this.getActualBalances(potentialHolders);
      
      // Sort by balance
      holders.sort((a, b) => b.balance - a.balance);
      
      // Calculate categories
      const categories = this.cacheManager.updateHolderCategories(holders, totalSupply);
      
      // Calculate top 10 percentage
      const top10Balance = holders.slice(0, 10).reduce((sum, h) => sum + h.balance, 0);
      const top10Percentage = (top10Balance / totalSupply) * 100;
      
      console.log('\n📊 HOLDER DISTRIBUTION:');
      console.log(`🔱 Poseidon (10%+): ${categories.poseidon}`);
      console.log(`🐋 Whale (1%+): ${categories.whale}`);
      console.log(`🦈 Shark (0.1%+): ${categories.shark}`);
      console.log(`🐬 Dolphin (0.01%+): ${categories.dolphin}`);
      console.log(`🦑 Squid (0.001%+): ${categories.squid}`);
      console.log(`🍤 Shrimp (<0.001%): ${categories.shrimp}`);
      console.log(`📊 Total holders: ${holders.length}`);
      console.log(`📊 Top 10 holders own: ${top10Percentage.toFixed(2)}%`);
      
      // Save to cache
      const cacheData = {
        lastBlock: currentBlock,
        totalSupply,
        totalHolders: holders.length,
        // Store ALL holders — the incremental updater rebuilds its working set from
        // this list, so a truncated cache silently collapses totalHolders over time
        // (this exact bug produced the corrupt 191-holder cache of 2025-11-19 that
        // prompted the Moralis detour). ~1,000 holders is a trivially small file.
        holders: holders,
        holderStats: {
          totalHolders: holders.length,
          ...categories,
          top10Percentage,
          dataSource: 'blockchain-full-scan',
          estimatedData: false,
          excludesLPPositions: true,
          realTimeData: true,
          lastUpdate: new Date().toISOString()
        }
      };
      
      this.cacheManager.saveCache(cacheData);
      console.log('\n✅ Initial holder snapshot created and cached!');
      
      return cacheData.holderStats;
      
    } catch (error) {
      console.error('❌ Failed to create initial snapshot:', error);
      throw error;
    }
  }
}

module.exports = InitialHolderSnapshot;