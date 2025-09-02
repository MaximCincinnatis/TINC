const fs = require('fs');
const path = require('path');

/**
 * Merge Missing Burns Script
 * Takes verified blockchain data and merges missing burns into production
 */

function mergeMissingBurns() {
  console.log('🔄 MERGING MISSING BURNS INTO PRODUCTION');
  console.log('=' .repeat(60));
  
  // Load data sources
  const prodPath = path.join(__dirname, '../../data/burn-data.json');
  const blockchainPath = path.join(__dirname, '../data/blockchain-burns.json');
  const reportPath = path.join(__dirname, '../data/comparison-report.json');
  
  // Backup current production data
  const backupPath = path.join(__dirname, '../../data/burn-data.backup-' + Date.now() + '.json');
  const prodData = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
  fs.writeFileSync(backupPath, JSON.stringify(prodData, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);
  
  const blockchainData = JSON.parse(fs.readFileSync(blockchainPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  console.log('\n📊 Current Status:');
  console.log(`Production burns: ${prodData.totalBurned.toFixed(2)} TINC`);
  console.log(`Blockchain burns: ${blockchainData.totalAmount.toFixed(2)} TINC`);
  console.log(`Missing: ${report.missingTransactions.length} transactions`);
  console.log(`Missing amount: ${(blockchainData.totalAmount - prodData.totalBurned).toFixed(2)} TINC`);
  
  // Create a map of existing transactions by hash
  const existingTxMap = new Map();
  prodData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      existingTxMap.set(tx.hash.toLowerCase(), { day: day.date, tx });
    });
  });
  
  // Process missing transactions
  let addedCount = 0;
  let addedAmount = 0;
  
  report.missingTransactions.forEach(missingTx => {
    const hash = missingTx.hash.toLowerCase();
    
    // Double-check it's not already there
    if (existingTxMap.has(hash)) {
      console.log(`⚠️ Transaction ${hash} already exists, skipping`);
      return;
    }
    
    // Find or create the day entry
    let dayEntry = prodData.dailyBurns.find(d => d.date === missingTx.date);
    if (!dayEntry) {
      dayEntry = {
        date: missingTx.date,
        amountTinc: 0,
        transactionCount: 0,
        transactions: []
      };
      prodData.dailyBurns.push(dayEntry);
    }
    
    // Add the missing transaction
    const txToAdd = {
      hash: missingTx.hash,
      amount: missingTx.amount,
      from: missingTx.from,
      blockNumber: missingTx.blockNumber,
      timestamp: missingTx.timestamp
    };
    
    dayEntry.transactions.push(txToAdd);
    dayEntry.amountTinc += missingTx.amount;
    dayEntry.transactionCount++;
    
    addedCount++;
    addedAmount += missingTx.amount;
    
    console.log(`✅ Added: ${missingTx.date} - ${missingTx.amount.toFixed(2)} TINC (${hash.slice(0, 10)}...)`);
  });
  
  // Sort daily burns by date
  prodData.dailyBurns.sort((a, b) => a.date.localeCompare(b.date));
  
  // Sort transactions within each day by block number
  prodData.dailyBurns.forEach(day => {
    day.transactions.sort((a, b) => (a.blockNumber || 0) - (b.blockNumber || 0));
  });
  
  // Recalculate totals
  const oldTotal = prodData.totalBurned;
  prodData.totalBurned = prodData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
  
  // Update burn percentage
  if (prodData.totalSupply) {
    prodData.burnPercentage = (prodData.totalBurned / prodData.totalSupply) * 100;
  }
  
  // Update date range
  if (prodData.dailyBurns.length > 0) {
    prodData.startDate = prodData.dailyBurns[0].date;
    prodData.endDate = prodData.dailyBurns[prodData.dailyBurns.length - 1].date;
  }
  
  console.log('\n📈 Merge Results:');
  console.log(`Added: ${addedCount} transactions`);
  console.log(`Added amount: ${addedAmount.toFixed(2)} TINC`);
  console.log(`Old total: ${oldTotal.toFixed(2)} TINC`);
  console.log(`New total: ${prodData.totalBurned.toFixed(2)} TINC`);
  console.log(`Difference: ${(prodData.totalBurned - oldTotal).toFixed(2)} TINC`);
  
  // Validate the merge
  const expectedTotal = blockchainData.totalAmount;
  const actualTotal = prodData.totalBurned;
  const tolerance = 1; // Allow 1 TINC tolerance for rounding
  
  if (Math.abs(expectedTotal - actualTotal) > tolerance) {
    console.log('\n⚠️ WARNING: Total doesn\'t match expected!');
    console.log(`Expected: ${expectedTotal.toFixed(2)} TINC`);
    console.log(`Actual: ${actualTotal.toFixed(2)} TINC`);
    console.log(`Difference: ${(expectedTotal - actualTotal).toFixed(2)} TINC`);
  } else {
    console.log('\n✅ Validation passed! Totals match blockchain data.');
  }
  
  // Save updated data
  fs.writeFileSync(prodPath, JSON.stringify(prodData, null, 2));
  console.log(`\n💾 Updated data saved to: ${prodPath}`);
  
  // Create versioned copy
  const timestamp = Date.now();
  const versionedPath = path.join(__dirname, '../../data', `burn-data-v${timestamp}.json`);
  fs.writeFileSync(versionedPath, JSON.stringify(prodData, null, 2));
  console.log(`📁 Versioned copy: ${versionedPath}`);
  
  // Update manifest
  const manifestPath = path.join(__dirname, '../../data/data-manifest.json');
  const manifest = {
    latest: `burn-data-v${timestamp}.json`,
    timestamp: new Date().toISOString(),
    version: timestamp,
    updateType: 'recovery-merge'
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  return {
    addedCount,
    addedAmount,
    oldTotal,
    newTotal: prodData.totalBurned,
    success: true
  };
}

// Run if called directly
if (require.main === module) {
  try {
    const result = mergeMissingBurns();
    console.log('\n' + '=' .repeat(60));
    console.log('✅ MERGE COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during merge:', error);
    process.exit(1);
  }
}

module.exports = { mergeMissingBurns };