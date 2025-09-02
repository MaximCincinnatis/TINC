const fs = require('fs');
const path = require('path');

function loadProductionData() {
  // Load current production burn data
  const prodPath = path.join(__dirname, '../../data/burn-data.json');
  const data = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
  
  // Get last 6 days
  const last6Days = data.dailyBurns.slice(-6);
  
  return {
    dailyBurns: last6Days,
    totalBurns: last6Days.reduce((sum, d) => sum + d.transactionCount, 0),
    totalAmount: last6Days.reduce((sum, d) => sum + d.amountTinc, 0)
  };
}

function loadBlockchainData() {
  const blockchainPath = path.join(__dirname, '../data/blockchain-burns.json');
  if (!fs.existsSync(blockchainPath)) {
    console.log('⚠️ Blockchain data not found. Run fetch-burns-independent.js first.');
    return null;
  }
  return JSON.parse(fs.readFileSync(blockchainPath, 'utf8'));
}

function compareData() {
  console.log('📊 Comparing Burn Data Sources');
  console.log('=' .repeat(50));
  
  const production = loadProductionData();
  const blockchain = loadBlockchainData();
  
  if (!blockchain) {
    return;
  }
  
  const report = {
    verificationDate: new Date().toISOString(),
    period: {
      start: production.dailyBurns[0].date,
      end: production.dailyBurns[production.dailyBurns.length - 1].date
    },
    summary: {
      production: {
        totalBurns: production.totalBurns,
        totalAmount: production.totalAmount
      },
      blockchain: {
        totalBurns: blockchain.totalBurns,
        totalAmount: blockchain.totalAmount
      },
      match: false,
      accuracy: 0
    },
    dailyComparison: [],
    discrepancies: [],
    missingTransactions: [],
    extraTransactions: []
  };
  
  // Compare daily totals
  production.dailyBurns.forEach(prodDay => {
    const blockDay = blockchain.dailyBurns.find(d => d.date === prodDay.date);
    
    if (!blockDay) {
      report.discrepancies.push({
        type: 'MISSING_DAY',
        date: prodDay.date,
        message: `Day ${prodDay.date} not found in blockchain data`
      });
      return;
    }
    
    const comparison = {
      date: prodDay.date,
      production: {
        amount: prodDay.amountTinc,
        txCount: prodDay.transactionCount
      },
      blockchain: {
        amount: blockDay.totalAmount,
        txCount: blockDay.transactionCount
      },
      match: false,
      diff: {
        amount: blockDay.totalAmount - prodDay.amountTinc,
        txCount: blockDay.transactionCount - prodDay.transactionCount
      }
    };
    
    // Check if amounts match (within 0.01 TINC tolerance for rounding)
    if (Math.abs(comparison.diff.amount) < 0.01 && comparison.diff.txCount === 0) {
      comparison.match = true;
    } else {
      report.discrepancies.push({
        type: 'AMOUNT_MISMATCH',
        date: prodDay.date,
        production: prodDay.amountTinc,
        blockchain: blockDay.totalAmount,
        difference: comparison.diff.amount,
        txDiff: comparison.diff.txCount
      });
    }
    
    report.dailyComparison.push(comparison);
  });
  
  // Calculate overall accuracy
  const totalMatches = report.dailyComparison.filter(d => d.match).length;
  report.summary.accuracy = (totalMatches / report.dailyComparison.length * 100).toFixed(2) + '%';
  report.summary.match = Math.abs(production.totalAmount - blockchain.totalAmount) < 0.1;
  
  // Detailed transaction comparison for mismatches
  production.dailyBurns.forEach(prodDay => {
    const blockDay = blockchain.dailyBurns.find(d => d.date === prodDay.date);
    if (!blockDay) return;
    
    // Compare transaction hashes
    const prodHashes = prodDay.transactions.map(t => t.hash.toLowerCase());
    const blockHashes = blockDay.burns.map(t => t.hash.toLowerCase());
    
    // Find missing transactions (in blockchain but not in production)
    blockHashes.forEach(hash => {
      if (!prodHashes.includes(hash)) {
        const tx = blockDay.burns.find(b => b.hash.toLowerCase() === hash);
        report.missingTransactions.push({
          date: prodDay.date,
          hash,
          amount: tx.amount,
          from: tx.from,
          blockNumber: tx.blockNumber
        });
      }
    });
    
    // Find extra transactions (in production but not in blockchain)
    prodHashes.forEach(hash => {
      if (!blockHashes.includes(hash)) {
        const tx = prodDay.transactions.find(t => t.hash.toLowerCase() === hash);
        report.extraTransactions.push({
          date: prodDay.date,
          hash,
          amount: tx.amount,
          from: tx.from
        });
      }
    });
  });
  
  // Save report
  const reportPath = path.join(__dirname, '../data/comparison-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n📈 VERIFICATION RESULTS:');
  console.log('-'.repeat(50));
  console.log(`Period: ${report.period.start} to ${report.period.end}`);
  console.log('\n📊 Totals Comparison:');
  console.log(`Production: ${production.totalAmount.toFixed(2)} TINC (${production.totalBurns} txs)`);
  console.log(`Blockchain: ${blockchain.totalAmount.toFixed(2)} TINC (${blockchain.totalBurns} txs)`);
  console.log(`Difference: ${(blockchain.totalAmount - production.totalAmount).toFixed(2)} TINC`);
  console.log(`Accuracy: ${report.summary.accuracy}`);
  
  console.log('\n📅 Daily Breakdown:');
  report.dailyComparison.forEach(day => {
    const status = day.match ? '✅' : '❌';
    console.log(`${status} ${day.date}: Prod=${day.production.amount.toFixed(2)} Block=${day.blockchain.amount.toFixed(2)} Diff=${day.diff.amount.toFixed(2)}`);
  });
  
  if (report.missingTransactions.length > 0) {
    console.log(`\n⚠️ Missing Transactions: ${report.missingTransactions.length}`);
    report.missingTransactions.slice(0, 3).forEach(tx => {
      console.log(`  - ${tx.hash.slice(0, 10)}... (${tx.amount.toFixed(2)} TINC)`);
    });
  }
  
  if (report.extraTransactions.length > 0) {
    console.log(`\n⚠️ Extra Transactions in Production: ${report.extraTransactions.length}`);
    report.extraTransactions.slice(0, 3).forEach(tx => {
      console.log(`  - ${tx.hash.slice(0, 10)}... (${tx.amount.toFixed(2)} TINC)`);
    });
  }
  
  console.log(`\n📁 Full report saved to: ${reportPath}`);
  
  return report;
}

// Run if called directly
if (require.main === module) {
  compareData();
}

module.exports = { compareData };