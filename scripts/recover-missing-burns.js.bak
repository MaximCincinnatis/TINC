#!/usr/bin/env node

/**
 * Recovery script to fetch missing burns from blockchain and add them to production data
 * This script will:
 * 1. Fetch all burns from blockchain for last 35 days
 * 2. Compare with production data
 * 3. Add any missing burns
 * 4. Preserve all existing features and data structure
 */

const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');
require('dotenv').config();

// Configuration
const RPC_ENDPOINTS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://eth-mainnet.public.blastapi.io'
];

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
const CHUNK_SIZE = 500;

let web3;
let currentRpcIndex = 0;

function initWeb3() {
  web3 = new Web3(RPC_ENDPOINTS[currentRpcIndex]);
}

initWeb3();

// TINC ABI (Transfer event only)
const TINC_ABI = [{
  "anonymous": false,
  "inputs": [
    {"indexed": true, "name": "from", "type": "address"},
    {"indexed": true, "name": "to", "type": "address"},
    {"indexed": false, "name": "value", "type": "uint256"}
  ],
  "name": "Transfer",
  "type": "event"
}];

// Load production data
function loadProductionData() {
  try {
    const manifestPath = path.join(__dirname, '../data/data-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const dataPath = path.join(__dirname, '../data', manifest.latest || 'burn-data.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error) {
    console.error('Error loading production data:', error);
    return null;
  }
}

// Save backup
function saveBackup(data) {
  const backupPath = path.join(__dirname, `../data/backup-before-recovery-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`✅ Backup saved to: ${backupPath}`);
  return backupPath;
}

// Fetch burns from blockchain
async function fetchBurnsFromBlockchain(startBlock, endBlock, retries = 3) {
  const burns = [];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const contract = new web3.eth.Contract(TINC_ABI, TINC_ADDRESS);
      const events = await contract.getPastEvents('Transfer', {
        filter: { to: BURN_ADDRESS },
        fromBlock: startBlock,
        toBlock: endBlock
      });
      
      for (const event of events) {
        const block = await web3.eth.getBlock(event.blockNumber);
        const amount = web3.utils.fromWei(event.returnValues.value, 'ether');
        const timestamp = Number(block.timestamp);
        
        burns.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(timestamp * 1000).toISOString(),
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          from: event.returnValues.from,
          amountTinc: parseFloat(amount),
          amountWei: event.returnValues.value
        });
      }
      
      console.log(`  ✅ Found ${events.length} burns in blocks ${startBlock}-${endBlock}`);
      return burns;
      
    } catch (error) {
      console.error(`  ❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < retries) {
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        initWeb3();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return burns;
}

// Fetch all burns for specified days
async function fetchAllBurnsForDays(days) {
  const currentBlock = Number(await web3.eth.getBlockNumber());
  const blocksPerDay = 7200;
  const startBlock = currentBlock - (days * blocksPerDay);
  
  console.log(`\n📊 Fetching ${days} days of burns from blockchain...`);
  console.log(`  Block range: ${startBlock} to ${currentBlock}`);
  
  const allBurns = [];
  
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    const burns = await fetchBurnsFromBlockchain(fromBlock, toBlock);
    allBurns.push(...burns);
    
    const progress = ((toBlock - startBlock) / (currentBlock - startBlock) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${progress}%`);
  }
  
  console.log('\n');
  return allBurns;
}

// Find missing burns
function findMissingBurns(prodData, blockchainBurns) {
  const prodTxHashes = new Set();
  
  // Collect all production transaction hashes
  if (prodData && prodData.dailyBurns) {
    for (const day of prodData.dailyBurns) {
      if (day.transactions) {
        for (const tx of day.transactions) {
          prodTxHashes.add(tx.hash);
        }
      }
    }
  }
  
  // Find burns that exist on blockchain but not in production
  const missing = [];
  for (const burn of blockchainBurns) {
    if (!prodTxHashes.has(burn.hash)) {
      missing.push(burn);
    }
  }
  
  return missing;
}

// Add missing burns to production data
function addMissingBurnsToData(prodData, missingBurns) {
  console.log(`\n🔧 Adding ${missingBurns.length} missing burns to production data...`);
  
  // Group missing burns by date
  const burnsByDate = {};
  for (const burn of missingBurns) {
    if (!burnsByDate[burn.date]) {
      burnsByDate[burn.date] = [];
    }
    burnsByDate[burn.date].push(burn);
  }
  
  // Add to daily burns
  for (const [date, burns] of Object.entries(burnsByDate)) {
    let dayData = prodData.dailyBurns.find(d => d.date === date);
    
    if (!dayData) {
      // Create new day entry if it doesn't exist
      dayData = {
        date: date,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      };
      prodData.dailyBurns.push(dayData);
    }
    
    // Add missing burns to this day
    for (const burn of burns) {
      dayData.transactions.push({
        hash: burn.hash,
        blockNumber: burn.blockNumber,
        from: burn.from,
        amountTinc: burn.amountTinc,
        timestamp: burn.timestamp
      });
      
      dayData.amountTinc += burn.amountTinc;
      dayData.transactionCount++;
      
      console.log(`  Added: ${burn.hash.substring(0, 10)}... - ${burn.amountTinc} TINC to ${date}`);
    }
  }
  
  // Sort daily burns by date
  prodData.dailyBurns.sort((a, b) => a.date.localeCompare(b.date));
  
  // Recalculate totals
  const oldTotal = prodData.totalBurned;
  prodData.totalBurned = prodData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
  
  // Update burn percentage
  if (prodData.totalSupply) {
    prodData.burnPercentage = (prodData.totalBurned / prodData.totalSupply) * 100;
  }
  
  // Update last modified
  prodData.lastUpdated = new Date().toISOString();
  prodData.recoveryApplied = true;
  prodData.recoveryTimestamp = new Date().toISOString();
  
  console.log(`\n📊 Recovery Summary:`);
  console.log(`  Old total: ${oldTotal} TINC`);
  console.log(`  New total: ${prodData.totalBurned} TINC`);
  console.log(`  Recovered: ${(prodData.totalBurned - oldTotal).toFixed(3)} TINC`);
  
  return prodData;
}

// Save recovered data
function saveRecoveredData(data) {
  // Create test file first
  const testPath = path.join(__dirname, '../data/burn-data-recovered-test.json');
  
  // Convert BigInts to strings for JSON serialization
  const jsonData = JSON.stringify(data, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, 2);
  
  fs.writeFileSync(testPath, jsonData);
  console.log(`\n✅ Test data saved to: ${testPath}`);
  console.log(`   Please verify before applying to production`);
  return testPath;
}

// Main recovery function
async function runRecovery() {
  try {
    console.log('🚀 Starting TINC Burn Recovery Process...\n');
    
    // Step 1: Load current production data
    const prodData = loadProductionData();
    if (!prodData) {
      console.error('❌ Failed to load production data');
      return;
    }
    
    console.log(`📁 Production data loaded:`);
    console.log(`   Total burned: ${prodData.totalBurned} TINC`);
    console.log(`   Days: ${prodData.dailyBurns.length}`);
    console.log(`   Transactions: ${prodData.dailyBurns.reduce((acc, d) => acc + (d.transactions?.length || 0), 0)}`);
    
    // Step 2: Create backup
    const backupPath = saveBackup(prodData);
    
    // Step 3: Fetch burns from blockchain (35 days for safety)
    const blockchainBurns = await fetchAllBurnsForDays(35);
    console.log(`✅ Fetched ${blockchainBurns.length} burns from blockchain`);
    
    // Step 4: Find missing burns
    const missingBurns = findMissingBurns(prodData, blockchainBurns);
    
    if (missingBurns.length === 0) {
      console.log('\n✅ No missing burns found! Data is complete.');
      return;
    }
    
    console.log(`\n❌ Found ${missingBurns.length} missing burns:`);
    const missingTotal = missingBurns.reduce((sum, b) => sum + b.amountTinc, 0);
    console.log(`   Total missing: ${missingTotal.toFixed(3)} TINC`);
    
    // Show first 5 missing burns
    console.log(`\n   First 5 missing burns:`);
    missingBurns.slice(0, 5).forEach(burn => {
      console.log(`     ${burn.hash.substring(0, 10)}... - ${burn.amountTinc} TINC - ${burn.date}`);
    });
    
    // Step 5: Add missing burns to data
    const recoveredData = addMissingBurnsToData(prodData, missingBurns);
    
    // Step 6: Save recovered data (test file)
    const testPath = saveRecoveredData(recoveredData);
    
    // Step 7: Validate recovered data
    console.log('\n🔍 Validating recovered data...');
    const blockchainTotal = blockchainBurns.reduce((sum, b) => sum + b.amountTinc, 0);
    const recoveredTotal = recoveredData.totalBurned;
    const difference = Math.abs(blockchainTotal - recoveredTotal);
    
    console.log(`   Blockchain total: ${blockchainTotal.toFixed(3)} TINC`);
    console.log(`   Recovered total: ${recoveredTotal.toFixed(3)} TINC`);
    console.log(`   Difference: ${difference.toFixed(3)} TINC`);
    
    if (difference < 1) {
      console.log('\n✅ Recovery successful! Data matches blockchain.');
    } else if (difference < 100) {
      console.log('\n⚠️  Small discrepancy detected, likely due to date range.');
    } else {
      console.log('\n❌ Large discrepancy detected! Manual review required.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Review the test file: ' + testPath);
    console.log('2. If correct, run: npm run apply-recovery');
    console.log('3. Or manually copy to production');
    
    return {
      success: true,
      recovered: missingBurns.length,
      totalRecovered: missingTotal,
      testFile: testPath
    };
    
  } catch (error) {
    console.error('\n❌ Recovery failed:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  runRecovery().then(result => {
    if (result.success) {
      console.log('\n✅ Recovery process completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Recovery process failed');
      process.exit(1);
    }
  });
}

module.exports = { runRecovery };