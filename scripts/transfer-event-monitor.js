const HolderCacheManager = require('./holder-cache-manager');
const { EXCLUDED_ADDRESSES } = require('./excluded-addresses');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CHUNK_SIZE = 5000; // Larger chunks for event logs

class TransferEventMonitor {
  constructor(rpcCall) {
    this.rpcCall = rpcCall;
    this.cacheManager = new HolderCacheManager();
  }

  async getTransferEventsSince(fromBlock, toBlock) {
    console.log(`📊 Fetching Transfer events from block ${fromBlock} to ${toBlock}...`);
    
    const allEvents = [];
    let currentFrom = fromBlock;
    
    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + CHUNK_SIZE - 1, toBlock);
      
      try {
        const logs = await this.rpcCall('eth_getLogs', [{
          fromBlock: `0x${currentFrom.toString(16)}`,
          toBlock: `0x${currentTo.toString(16)}`,
          address: TINC_ADDRESS,
          topics: [TRANSFER_TOPIC]
        }]);
        
        const events = logs.map(log => ({
          from: '0x' + log.topics[1].substring(26),
          to: '0x' + log.topics[2].substring(26),
          value: parseInt(log.data, 16) / Math.pow(10, 18),
          blockNumber: parseInt(log.blockNumber, 16),
          transactionHash: log.transactionHash
        }));
        
        allEvents.push(...events);
        console.log(`  ✅ Found ${events.length} transfers in blocks ${currentFrom}-${currentTo}`);
        
      } catch (error) {
        console.warn(`  ⚠️ Error fetching chunk ${currentFrom}-${currentTo}:`, error.message);
      }
      
      currentFrom = currentTo + 1;
    }
    
    return allEvents;
  }

  async identifyAffectedAddresses(events) {
    const affectedAddresses = new Set();
    
    events.forEach(event => {
      // Add sender (unless it's zero address - minting)
      if (event.from !== ZERO_ADDRESS) {
        affectedAddresses.add(event.from.toLowerCase());
      }
      
      // Add receiver (unless it's zero address - burning)
      if (event.to !== ZERO_ADDRESS) {
        affectedAddresses.add(event.to.toLowerCase());
      }
    });
    
    return Array.from(affectedAddresses);
  }

  async checkBalances(addresses, rpcCall) {
    console.log(`🔍 Checking balances for ${addresses.length} addresses...`);
    
    const balances = {};
    const batchSize = 20; // Reduced batch size for better rate limiting
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      // Process addresses sequentially with delays to avoid rate limits
      for (const address of batch) {
        try {
          const balanceHex = await rpcCall('eth_call', [
            {
              to: TINC_ADDRESS,
              data: '0x70a08231' + address.substring(2).padStart(64, '0') // balanceOf(address)
            },
            'latest'
          ]);
          
          const balance = parseInt(balanceHex, 16) / Math.pow(10, 18);
          balances[address.toLowerCase()] = balance;
          
          // Small delay between calls to be nice to free RPC endpoints
          if (batch.indexOf(address) < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.warn(`Failed to get balance for ${address}:`, error.message);
          balances[address.toLowerCase()] = 0;
          
          // Longer delay on error (might be rate limited)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`  ✅ Processed ${Math.min(i + batchSize, addresses.length)}/${addresses.length} addresses`);
      
      // Delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return balances;
  }

  async getIncrementalHolderUpdate(lastBlockNumber, currentBlockNumber, rpcCall) {
    const cache = this.cacheManager.loadCache();
    if (!cache) {
      console.log('❌ No cache found - need initial snapshot first');
      return null;
    }

    // Get all transfer events since last update
    const events = await this.getTransferEventsSince(lastBlockNumber + 1, currentBlockNumber);
    console.log(`📊 Found ${events.length} transfer events since last update`);

    if (events.length === 0) {
      console.log('✅ No changes - returning cached data');
      return cache.holderStats;
    }

    // Identify addresses that might have changed
    const affectedAddresses = await this.identifyAffectedAddresses(events);
    console.log(`🔍 ${affectedAddresses.length} addresses affected by transfers`);

    // Check current balances for affected addresses
    const newBalances = await this.checkBalances(affectedAddresses, rpcCall);

    // Update holder data - start with ALL cached holders
    const currentHolders = new Map();
    
    // Load all existing holders from cache (not just top 100)
    if (cache.holders) {
      cache.holders.forEach(holder => {
        const address = (holder.address || holder.owner_address).toLowerCase();
        const balance = parseFloat(holder.balance_formatted || holder.balance);
        currentHolders.set(address, { address, balance });
      });
    }

    console.log(`📊 Starting with ${currentHolders.size} cached holders`);

    // Update only the addresses that had transfer activity
    let updatedCount = 0;
    Object.entries(newBalances).forEach(([address, balance]) => {
      if (balance > 0.000001) { // Minimum threshold to avoid dust
        currentHolders.set(address, { address, balance });
        updatedCount++;
      } else {
        if (currentHolders.has(address)) {
          currentHolders.delete(address);
          updatedCount++;
        }
      }
    });

    console.log(`📊 Updated ${updatedCount} holder balances`);

    // Convert back to array and filter out excluded addresses
    const allHolders = Array.from(currentHolders.values());
    const updatedHolders = allHolders.filter(holder => 
      !EXCLUDED_ADDRESSES.has(holder.address.toLowerCase())
    );
    
    console.log(`📊 Filtered out ${allHolders.length - updatedHolders.length} excluded addresses (LP/contracts)`);
    
    const totalSupply = cache.totalSupply; // Keep existing total supply
    
    const categories = this.cacheManager.updateHolderCategories(updatedHolders, totalSupply);

    // Calculate top 10 percentage (excluding LP addresses)
    const sortedHolders = [...updatedHolders].sort((a, b) => b.balance - a.balance);
    const top10Balance = sortedHolders.slice(0, 10).reduce((sum, h) => sum + h.balance, 0);
    const top10Percentage = (top10Balance / totalSupply) * 100;

    console.log(`📊 Final holder count: ${updatedHolders.length} (was ${cache.totalHolders})`);

    // Update cache - store ALL holders to maintain complete list
    const updatedData = {
      lastBlock: currentBlockNumber,
      totalSupply,
      totalHolders: updatedHolders.length,
      holders: sortedHolders, // Store ALL holders for future incremental updates
      holderStats: {
        totalHolders: updatedHolders.length,
        ...categories,
        top10Percentage,
        dataSource: 'blockchain-incremental',
        lastUpdate: new Date().toISOString()
      }
    };

    this.cacheManager.saveCache(updatedData);
    return updatedData.holderStats;
  }
}

module.exports = TransferEventMonitor;