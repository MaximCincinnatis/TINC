#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');
require('dotenv').config();

// RPC endpoints
const RPC_ENDPOINTS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://eth-mainnet.public.blastapi.io',
  'https://ethereum.blockpi.network/v1/rpc/public'
];

// Contract addresses
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';

// Initialize Web3
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

// Fetch burns from blockchain for a specific range
async function fetchBurnsFromBlockchain(startBlock, endBlock, retries = 3) {
  const burns = [];
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Fetching blocks ${startBlock}-${endBlock} (attempt ${attempt}/${retries})...`);
      
      const contract = new web3.eth.Contract(TINC_ABI, TINC_ADDRESS);
      const events = await contract.getPastEvents('Transfer', {
        filter: { to: BURN_ADDRESS },
        fromBlock: startBlock,
        toBlock: endBlock
      });
      
      for (const event of events) {
        const block = await web3.eth.getBlock(event.blockNumber);
        burns.push({
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          from: event.returnValues.from,
          amount: (BigInt(event.returnValues.value) / BigInt(10**18)).toString()
        });
      }
      
      console.log(`    ✅ Found ${events.length} burns`);
      return burns;
      
    } catch (error) {
      console.error(`    ❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < retries) {
        // Rotate RPC
        currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
        initWeb3();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return burns;
}

// Get all burns for last N days
async function fetchAllBurnsForDays(days) {
  const currentBlock = Number(await web3.eth.getBlockNumber());
  const blocksPerDay = 7200;
  const startBlock = currentBlock - (days * blocksPerDay);
  
  console.log(`\n📊 Fetching ${days} days of burns from blockchain...`);
  console.log(`  Block range: ${startBlock} to ${currentBlock}`);
  
  const allBurns = [];
  const CHUNK_SIZE = 500;
  
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    const burns = await fetchBurnsFromBlockchain(fromBlock, toBlock);
    allBurns.push(...burns);
    
    // Progress update
    const progress = ((toBlock - startBlock) / (currentBlock - startBlock) * 100).toFixed(1);
    console.log(`  Progress: ${progress}%`);
  }
  
  return allBurns;
}

// Compare production data with blockchain data
function compareData(prodData, blockchainBurns) {
  const prodTxs = new Set();
  const blockchainTxs = new Map();
  
  // Collect production transactions
  if (prodData && prodData.dailyBurns) {
    for (const day of prodData.dailyBurns) {
      if (day.transactions) {
        for (const tx of day.transactions) {
          prodTxs.add(tx.hash);
        }
      }
    }
  }
  
  // Collect blockchain transactions
  let blockchainTotal = 0;
  for (const burn of blockchainBurns) {
    blockchainTxs.set(burn.transactionHash, burn);
    blockchainTotal += parseFloat(burn.amount);
  }
  
  // Find missing transactions
  const missing = [];
  for (const [hash, burn] of blockchainTxs) {
    if (!prodTxs.has(hash)) {
      missing.push(burn);
    }
  }
  
  // Find extra transactions (in prod but not on blockchain)
  const extra = [];
  if (prodData && prodData.dailyBurns) {
    for (const day of prodData.dailyBurns) {
      if (day.transactions) {
        for (const tx of day.transactions) {
          if (!blockchainTxs.has(tx.hash)) {
            extra.push(tx);
          }
        }
      }
    }
  }
  
  return {
    prodTotal: prodData ? prodData.totalBurned : 0,
    blockchainTotal: blockchainTotal.toFixed(3),
    prodTxCount: prodTxs.size,
    blockchainTxCount: blockchainTxs.size,
    missingTxs: missing,
    extraTxs: extra,
    missingTotal: missing.reduce((sum, burn) => sum + parseFloat(burn.amount), 0).toFixed(3),
    extraTotal: extra.reduce((sum, tx) => sum + (tx.amountTinc || 0), 0).toFixed(3)
  };
}

// Generate detailed report
function generateReport(comparison, days) {
  const report = [];
  
  report.push('\n' + '='.repeat(70));
  report.push('TINC BURN VERIFICATION REPORT');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Period: Last ${days} days`);
  report.push('='.repeat(70));
  
  report.push('\n📊 SUMMARY');
  report.push(`  Production Total:    ${comparison.prodTotal} TINC (${comparison.prodTxCount} txs)`);
  report.push(`  Blockchain Total:    ${comparison.blockchainTotal} TINC (${comparison.blockchainTxCount} txs)`);
  report.push(`  Difference:          ${(comparison.prodTotal - comparison.blockchainTotal).toFixed(3)} TINC`);
  report.push(`  Accuracy:            ${(comparison.prodTotal / comparison.blockchainTotal * 100).toFixed(2)}%`);
  
  if (comparison.missingTxs.length > 0) {
    report.push('\n❌ MISSING TRANSACTIONS (on blockchain but not in production)');
    report.push(`  Count: ${comparison.missingTxs.length}`);
    report.push(`  Total: ${comparison.missingTotal} TINC`);
    
    // Show first 5 missing transactions
    report.push('\n  First 5 missing:');
    comparison.missingTxs.slice(0, 5).forEach(tx => {
      report.push(`    ${tx.transactionHash.substring(0, 10)}... | ${tx.amount} TINC | Block ${tx.blockNumber}`);
    });
  }
  
  if (comparison.extraTxs.length > 0) {
    report.push('\n⚠️  EXTRA TRANSACTIONS (in production but not on blockchain)');
    report.push(`  Count: ${comparison.extraTxs.length}`);
    report.push(`  Total: ${comparison.extraTotal} TINC`);
    
    // Show first 5 extra transactions
    report.push('\n  First 5 extra:');
    comparison.extraTxs.slice(0, 5).forEach(tx => {
      report.push(`    ${tx.hash.substring(0, 10)}... | ${tx.amountTinc} TINC`);
    });
  }
  
  // Verdict
  report.push('\n' + '='.repeat(70));
  if (Math.abs(comparison.prodTotal - comparison.blockchainTotal) < 1) {
    report.push('✅ VERIFICATION PASSED: Data is accurate');
  } else if (comparison.missingTxs.length > 0) {
    report.push('❌ VERIFICATION FAILED: Missing burns detected');
    report.push('   Action Required: Run recovery script to add missing burns');
  } else if (comparison.extraTxs.length > 0) {
    report.push('⚠️  VERIFICATION WARNING: Extra transactions found');
    report.push('   Action Required: Investigate duplicate or invalid transactions');
  }
  report.push('='.repeat(70));
  
  return report.join('\n');
}

// Save missing burns to file for recovery
function saveMissingBurns(missingBurns) {
  if (missingBurns.length === 0) return;
  
  const outputPath = path.join(__dirname, 'missing-burns.json');
  const data = {
    timestamp: new Date().toISOString(),
    count: missingBurns.length,
    totalAmount: missingBurns.reduce((sum, burn) => sum + parseFloat(burn.amount), 0).toFixed(3),
    burns: missingBurns
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Missing burns saved to: ${outputPath}`);
}

// Main verification function
async function runVerification() {
  try {
    console.log('🔍 Starting TINC Burn Verification...\n');
    
    // Load production data
    const prodData = loadProductionData();
    if (!prodData) {
      console.error('❌ Failed to load production data');
      return;
    }
    
    console.log(`📁 Production data loaded: ${prodData.totalBurned} TINC total`);
    
    // Determine days to check (based on production data range)
    const days = 30; // Check full 30-day window
    
    // Fetch all burns from blockchain
    const blockchainBurns = await fetchAllBurnsForDays(days);
    console.log(`\n✅ Fetched ${blockchainBurns.length} burns from blockchain`);
    
    // Compare data
    const comparison = compareData(prodData, blockchainBurns);
    
    // Generate and display report
    const report = generateReport(comparison, days);
    console.log(report);
    
    // Save report to file
    const reportPath = path.join(__dirname, 'verification-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Save missing burns if any
    if (comparison.missingTxs.length > 0) {
      saveMissingBurns(comparison.missingTxs);
    }
    
    // Return result for automation
    return {
      passed: Math.abs(comparison.prodTotal - comparison.blockchainTotal) < 1,
      difference: (comparison.prodTotal - comparison.blockchainTotal).toFixed(3),
      missingCount: comparison.missingTxs.length
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { passed: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  runVerification().then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}

module.exports = { runVerification };