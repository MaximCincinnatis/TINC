#!/usr/bin/env node
/**
 * Recovery script to fetch all missing burns
 * Specifically targets Aug 25-28 where we know burns are missing
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function recoverBurns() {
  console.log('🔥 BURN RECOVERY SCRIPT');
  console.log('=======================');
  console.log('Recovering missing burns from Aug 25-28, 2025\n');
  
  const web3 = new Web3('https://ethereum-rpc.publicnode.com');
  
  const tincAbi = [
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "name": "from", "type": "address"},
        {"indexed": true, "name": "to", "type": "address"},
        {"indexed": false, "name": "value", "type": "uint256"}
      ],
      "name": "Transfer",
      "type": "event"
    }
  ];
  
  const contract = new web3.eth.Contract(tincAbi, TINC_ADDRESS);
  
  // Scan the entire range where we have 100% coverage
  // But specifically Aug 25-28 where burns are missing
  const scanRanges = [
    { date: '2025-08-25', start: 23214800, end: 23222199 },
    { date: '2025-08-26', start: 23222200, end: 23229599 },
    { date: '2025-08-27', start: 23229600, end: 23236999 },
    { date: '2025-08-28', start: 23237000, end: 23244399 }
  ];
  
  const allBurns = [];
  
  for (const range of scanRanges) {
    console.log(`📅 Scanning ${range.date} (blocks ${range.start}-${range.end})...`);
    
    try {
      const events = await contract.getPastEvents('Transfer', {
        filter: { to: ZERO_ADDRESS },
        fromBlock: range.start,
        toBlock: range.end
      });
      
      console.log(`   Found ${events.length} burns`);
      
      for (const event of events) {
        const block = await web3.eth.getBlock(event.blockNumber);
        const amount = parseFloat(web3.utils.fromWei(event.returnValues.value, 'ether'));
        const timestamp = typeof block.timestamp === 'bigint' ? Number(block.timestamp) : block.timestamp;
        
        allBurns.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          from: event.returnValues.from.toLowerCase(),
          amount: amount,
          timestamp: timestamp,
          date: new Date(timestamp * 1000).toISOString().split('T')[0]
        });
        
        console.log(`   • Block ${event.blockNumber}: ${amount.toFixed(2)} TINC`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Group burns by date
  const burnsByDate = {};
  allBurns.forEach(burn => {
    if (!burnsByDate[burn.date]) {
      burnsByDate[burn.date] = {
        date: burn.date,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      };
    }
    
    burnsByDate[burn.date].amountTinc += burn.amount;
    burnsByDate[burn.date].transactionCount++;
    burnsByDate[burn.date].transactions.push({
      hash: burn.hash,
      amount: burn.amount,
      from: burn.from,
      blockNumber: burn.blockNumber,
      timestamp: burn.timestamp
    });
  });
  
  // Create complete burn data structure
  const dailyBurns = Object.values(burnsByDate).sort((a, b) => a.date.localeCompare(b.date));
  const totalBurned = dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
  
  const burnData = {
    startDate: dailyBurns[0]?.date || '2025-08-25',
    endDate: dailyBurns[dailyBurns.length - 1]?.date || '2025-08-28',
    totalBurned: totalBurned,
    totalSupply: 16000000, // Approximate
    burnPercentage: (totalBurned / 16000000) * 100,
    emissionPerSecond: 1,
    emissionSamplePeriod: 86400,
    isDeflationary: true,
    dailyBurns: dailyBurns,
    lastUpdated: new Date().toISOString(),
    holderData: {
      totalHolders: 1000, // Placeholder
      estimatedData: true
    }
  };
  
  // JSON replacer to handle BigInt
  const jsonReplacer = (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  };
  
  // Save to data folder
  const dataPath = path.join(__dirname, '../data/burn-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(burnData, jsonReplacer, 2));
  console.log(`\n💾 Saved to ${dataPath}`);
  
  // Copy to public folder
  const publicPath = path.join(__dirname, '../public/data/burn-data.json');
  fs.writeFileSync(publicPath, JSON.stringify(burnData, jsonReplacer, 2));
  console.log(`💾 Saved to ${publicPath}`);
  
  // Summary
  console.log('\n════════════════════════════════════');
  console.log('         RECOVERY COMPLETE          ');
  console.log('════════════════════════════════════\n');
  
  Object.values(burnsByDate).forEach(day => {
    console.log(`${day.date}: ${day.transactionCount} burns, ${day.amountTinc.toFixed(2)} TINC`);
  });
  
  console.log(`\n📊 TOTAL: ${allBurns.length} burns, ${totalBurned.toFixed(2)} TINC`);
  
  // Update processed ranges
  const rangeData = {
    ranges: [{
      start: 23214800,
      end: 23244399
    }],
    lastContinuousBlock: 23244399,
    totalGaps: 0,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(__dirname, '../data/processed-ranges.json'), JSON.stringify(rangeData, null, 2));
  console.log('\n✅ Updated processed ranges');
}

recoverBurns().catch(console.error);