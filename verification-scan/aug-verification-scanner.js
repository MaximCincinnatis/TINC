const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CHUNK_SIZE = 400;

// RPC endpoints for rotation
const RPC_ENDPOINTS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.public-rpc.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com'
];

let currentRpcIndex = 0;

function getNextRpc() {
  const rpc = RPC_ENDPOINTS[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return rpc;
}

async function scanDateRange(date, startBlock, endBlock) {
  console.log(`\n📅 Scanning ${date} (blocks ${startBlock} to ${endBlock})`);
  console.log(`   Total blocks to scan: ${endBlock - startBlock + 1}`);
  
  const burns = [];
  let totalBurned = 0;
  let failedChunks = [];
  
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
  
  for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, endBlock);
    
    let attempt = 0;
    let success = false;
    
    while (attempt < 3 && !success) {
      attempt++;
      const rpcUrl = getNextRpc();
      
      try {
        process.stdout.write(`   📦 Chunk ${fromBlock}-${toBlock} (attempt ${attempt})... `);
        
        const web3 = new Web3(rpcUrl);
        const contract = new web3.eth.Contract(tincAbi, TINC_ADDRESS);
        
        const events = await contract.getPastEvents('Transfer', {
          filter: { to: ZERO_ADDRESS },
          fromBlock: fromBlock,
          toBlock: toBlock
        });
        
        if (events.length > 0) {
          console.log(`✅ Found ${events.length} burns!`);
          
          for (const event of events) {
            const amount = parseFloat(web3.utils.fromWei(event.returnValues.value, 'ether'));
            const block = await web3.eth.getBlock(event.blockNumber);
            
            const burnData = {
              hash: event.transactionHash,
              blockNumber: event.blockNumber,
              from: event.returnValues.from.toLowerCase(),
              amount: amount,
              timestamp: Number(block.timestamp),
              date: date
            };
            
            burns.push(burnData);
            totalBurned += amount;
            
            console.log(`      • Block ${event.blockNumber}: ${amount.toFixed(2)} TINC`);
            console.log(`        Hash: ${event.transactionHash}`);
            console.log(`        From: ${event.returnValues.from}`);
          }
        } else {
          console.log('✅ No burns');
        }
        
        success = true;
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (attempt >= 3) {
          failedChunks.push({ start: fromBlock, end: toBlock, error: error.message });
        }
      }
    }
  }
  
  return {
    date,
    burns,
    totalBurned,
    failedChunks,
    blockRange: { start: startBlock, end: endBlock }
  };
}

async function main() {
  console.log('🔍 Independent Verification Scanner for TINC Burns');
  console.log('==================================================');
  console.log('Target: August 25-28, 2025');
  console.log('Method: Direct blockchain scan for transfers to 0x0');
  console.log('');
  
  // Define exact block ranges for each day
  const scanRanges = [
    { date: '2025-08-25', start: 23214800, end: 23222199 },
    { date: '2025-08-26', start: 23222200, end: 23229599 },
    { date: '2025-08-27', start: 23229600, end: 23236999 },
    { date: '2025-08-28', start: 23237000, end: 23244399 }
  ];
  
  const results = {
    scanDate: new Date().toISOString(),
    method: 'Direct Transfer event scan to 0x0',
    dailyResults: [],
    summary: {
      totalBurns: 0,
      totalTinc: 0,
      failedChunks: []
    }
  };
  
  for (const range of scanRanges) {
    const dayResult = await scanDateRange(range.date, range.start, range.end);
    results.dailyResults.push(dayResult);
    results.summary.totalBurns += dayResult.burns.length;
    results.summary.totalTinc += dayResult.totalBurned;
    results.summary.failedChunks.push(...dayResult.failedChunks);
  }
  
  // Save results
  const outputPath = path.join(__dirname, 'verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n');
  console.log('════════════════════════════════════════════');
  console.log('         VERIFICATION SCAN COMPLETE         ');
  console.log('════════════════════════════════════════════');
  console.log('');
  
  results.dailyResults.forEach(day => {
    console.log(`📅 ${day.date}:`);
    console.log(`   Burns found: ${day.burns.length}`);
    console.log(`   TINC burned: ${day.totalBurned.toFixed(2)}`);
    if (day.failedChunks.length > 0) {
      console.log(`   ⚠️  Failed chunks: ${day.failedChunks.length}`);
    }
  });
  
  console.log('');
  console.log('📊 TOTAL SUMMARY:');
  console.log(`   Total burns: ${results.summary.totalBurns}`);
  console.log(`   Total TINC: ${results.summary.totalTinc.toFixed(2)}`);
  
  if (results.summary.failedChunks.length > 0) {
    console.log(`\n⚠️  Warning: ${results.summary.failedChunks.length} chunks failed to scan`);
  }
  
  console.log(`\n📄 Full results saved to: ${outputPath}`);
  
  // Compare with existing data
  console.log('\n🔬 Comparing with existing data...');
  const existingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/burn-data.json')));
  
  const dates = ['2025-08-25', '2025-08-26', '2025-08-27', '2025-08-28'];
  console.log('\nDate       | Existing | Verified | Match?');
  console.log('-----------|----------|----------|-------');
  
  dates.forEach(date => {
    const existing = existingData.dailyBurns.find(d => d.date === date);
    const verified = results.dailyResults.find(d => d.date === date);
    
    const existingCount = existing ? existing.transactionCount : 0;
    const verifiedCount = verified ? verified.burns.length : 0;
    const match = existingCount === verifiedCount ? '✅' : '❌';
    
    console.log(`${date} | ${existingCount.toString().padStart(8)} | ${verifiedCount.toString().padStart(8)} | ${match}`);
  });
}

main().catch(console.error);