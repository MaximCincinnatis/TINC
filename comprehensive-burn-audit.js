require('dotenv').config();
const { callRPC } = require('./scripts/fetch-burn-data.js');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// All possible burn addresses
const BURN_ADDRESSES = {
  'zero': {
    address: '0x0000000000000000000000000000000000000000',
    topic: '0x0000000000000000000000000000000000000000000000000000000000000000',
    name: 'Zero Address (0x0000...0000)'
  },
  'dead': {
    address: '0x000000000000000000000000000000000000dEaD',
    topic: '0x000000000000000000000000000000000000000000000000000000000000dead',
    name: 'Dead Address (0x...dEaD)'
  },
  'dead2': {
    address: '0xdEAD000000000000000042069420694206942069',
    topic: '0x000000000000000000000000dead000000000000000042069420694206942069',
    name: 'Alternative Dead'
  }
};

async function scanBurnAddress(burnType, days = 30) {
  const burnInfo = BURN_ADDRESSES[burnType];
  console.log(`\n🔍 Scanning ${burnInfo.name}`);
  console.log(`   Address: ${burnInfo.address}`);
  
  try {
    const currentBlockHex = await callRPC('eth_blockNumber', []);
    const currentBlock = parseInt(currentBlockHex, 16);
    
    const blocksPerDay = 7200;
    const startBlock = currentBlock - (days * blocksPerDay);
    
    const CHUNK_SIZE = 800;
    const allLogs = [];
    const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
    let processed = 0;
    
    for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
      processed++;
      
      process.stdout.write(`\r   Scanning: ${processed}/${totalChunks} chunks...`);
      
      try {
        const logs = await callRPC('eth_getLogs', [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${toBlock.toString(16)}`,
          address: TINC_ADDRESS,
          topics: [
            TRANSFER_TOPIC,
            null, // from any address
            burnInfo.topic // to burn address
          ]
        }]);
        
        if (logs && logs.length > 0) {
          allLogs.push(...logs);
        }
      } catch (error) {
        // Continue scanning
      }
    }
    
    console.log(''); // New line after progress
    
    let totalBurned = 0;
    const dailyBurns = {};
    
    for (const log of allLogs) {
      const amount = parseInt(log.data, 16) / Math.pow(10, 18);
      totalBurned += amount;
      
      // Get date for this burn
      const block = await callRPC('eth_getBlockByNumber', [log.blockNumber, false]);
      const timestamp = parseInt(block.timestamp, 16);
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      
      if (!dailyBurns[date]) {
        dailyBurns[date] = { amount: 0, count: 0 };
      }
      dailyBurns[date].amount += amount;
      dailyBurns[date].count++;
    }
    
    return {
      address: burnInfo.address,
      name: burnInfo.name,
      totalBurned,
      transactionCount: allLogs.length,
      dailyBurns,
      logs: allLogs.slice(0, 5) // Keep first 5 for verification
    };
    
  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return {
      address: burnInfo.address,
      name: burnInfo.name,
      totalBurned: 0,
      transactionCount: 0,
      error: error.message
    };
  }
}

async function getTotalSupply() {
  const totalSupplyHex = await callRPC('eth_call', [
    { to: TINC_ADDRESS, data: '0x18160ddd' },
    'latest'
  ]);
  return parseInt(totalSupplyHex, 16) / Math.pow(10, 18);
}

async function comprehensiveAudit() {
  console.log('=== COMPREHENSIVE TINC BURN AUDIT ===');
  console.log('=====================================\n');
  
  const DAYS_TO_CHECK = 30;
  console.log(`Checking last ${DAYS_TO_CHECK} days of burns...\n`);
  
  // Get current total supply
  const totalSupply = await getTotalSupply();
  console.log(`Current TINC Total Supply: ${totalSupply.toLocaleString()}\n`);
  
  // Check each burn address
  const results = {};
  for (const [key, _] of Object.entries(BURN_ADDRESSES)) {
    results[key] = await scanBurnAddress(key, DAYS_TO_CHECK);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('BURN SUMMARY (Last 30 Days)');
  console.log('='.repeat(50));
  
  let grandTotal = 0;
  let grandTxCount = 0;
  
  for (const [key, result] of Object.entries(results)) {
    console.log(`\n${result.name}:`);
    console.log(`  Total Burned: ${result.totalBurned.toLocaleString()} TINC`);
    console.log(`  Transactions: ${result.transactionCount}`);
    
    if (result.transactionCount > 0) {
      console.log(`  Daily Average: ${(result.totalBurned / DAYS_TO_CHECK).toFixed(2)} TINC`);
      
      // Show last few burns
      console.log(`  Recent burns:`);
      const dates = Object.keys(result.dailyBurns).sort().slice(-3);
      for (const date of dates) {
        const data = result.dailyBurns[date];
        console.log(`    ${date}: ${data.amount.toFixed(2)} TINC (${data.count} txs)`);
      }
    }
    
    grandTotal += result.totalBurned;
    grandTxCount += result.transactionCount;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('TOTAL BURNS (ALL ADDRESSES)');
  console.log('='.repeat(50));
  console.log(`Total Burned: ${grandTotal.toLocaleString()} TINC`);
  console.log(`Total Transactions: ${grandTxCount}`);
  console.log(`Percentage of Supply: ${((grandTotal / totalSupply) * 100).toFixed(4)}%`);
  
  // Check what we're currently monitoring
  console.log('\n' + '='.repeat(50));
  console.log('CURRENT MONITORING STATUS');
  console.log('='.repeat(50));
  console.log('✅ Monitoring: Zero Address (0x0000...0000)');
  console.log('❌ NOT Monitoring: Dead Address (0x...dEaD)');
  console.log('❌ NOT Monitoring: Other burn addresses');
  
  // Load our current data for comparison
  const fs = require('fs');
  const ourData = JSON.parse(fs.readFileSync('./data/burn-data.json', 'utf8'));
  const ourTotal = ourData.totalBurned;
  
  console.log('\n' + '='.repeat(50));
  console.log('DATA COMPARISON');
  console.log('='.repeat(50));
  console.log(`Our Dashboard Shows: ${ourTotal.toFixed(2)} TINC burned`);
  console.log(`Zero Address Burns: ${results.zero.totalBurned.toFixed(2)} TINC`);
  console.log(`Match: ${Math.abs(ourTotal - results.zero.totalBurned) < 1 ? '✅ YES' : '❌ NO'}`);
  
  if (results.dead.totalBurned > 0) {
    console.log(`\n⚠️  WARNING: ${results.dead.totalBurned.toFixed(2)} TINC burned to 0xdead NOT tracked!`);
  }
  
  // Recommendations
  console.log('\n' + '='.repeat(50));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(50));
  
  if (results.dead.totalBurned > 0 || results.dead2.totalBurned > 0) {
    console.log('⚠️  Consider monitoring additional burn addresses:');
    if (results.dead.totalBurned > 0) {
      console.log(`   - Add 0xdead monitoring (${results.dead.totalBurned.toFixed(2)} TINC missing)`);
    }
    if (results.dead2.totalBurned > 0) {
      console.log(`   - Add alternative dead address monitoring`);
    }
  } else {
    console.log('✅ Current monitoring of 0x0000...0000 appears sufficient');
    console.log('✅ No burns detected to other common burn addresses');
  }
}

// Run the audit
comprehensiveAudit().catch(console.error);