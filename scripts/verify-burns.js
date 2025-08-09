const https = require('https');

// TINC Token address
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

// Get transfers to burn address in last 7 days
const fromTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${TINC_ADDRESS}&address=${ZERO_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;

console.log('Fetching TINC burn transactions from Etherscan...\n');

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.status === '1' && result.result) {
      const recentBurns = result.result.filter(tx => parseInt(tx.timeStamp) >= fromTimestamp);
      console.log('Found', recentBurns.length, 'burn transactions in last 7 days');
      
      // Group by date
      const burnsByDate = {};
      recentBurns.forEach(tx => {
        const date = new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0];
        if (!burnsByDate[date]) burnsByDate[date] = { count: 0, total: 0, txs: [] };
        burnsByDate[date].count++;
        burnsByDate[date].total += parseFloat(tx.value) / 1e18;
        burnsByDate[date].txs.push({
          hash: tx.hash,
          amount: parseFloat(tx.value) / 1e18,
          from: tx.from
        });
      });
      
      console.log('\n=== ON-CHAIN BURNS (from Etherscan) ===');
      Object.keys(burnsByDate).sort().forEach(date => {
        console.log(date + ':', burnsByDate[date].total.toFixed(2), 'TINC (', burnsByDate[date].count, 'txs)');
      });
      
      // Load our cached data for comparison
      const fs = require('fs');
      const cachedData = JSON.parse(fs.readFileSync('./data/burn-data.json', 'utf8'));
      const last7 = cachedData.dailyBurns.slice(-7);
      
      console.log('\n=== CACHED BURNS (from burn-data.json) ===');
      last7.forEach(d => {
        console.log(d.date + ':', d.amountTinc.toFixed(2), 'TINC (', d.transactionCount, 'txs)');
      });
      
      console.log('\n=== COMPARISON ===');
      last7.forEach(cached => {
        const onchain = burnsByDate[cached.date];
        if (onchain) {
          const diff = cached.amountTinc - onchain.total;
          const status = Math.abs(diff) < 0.01 ? '✓ MATCH' : `⚠ DIFF: ${diff.toFixed(2)} TINC`;
          console.log(`${cached.date}: ${status}`);
          console.log(`  Cached: ${cached.amountTinc.toFixed(2)} TINC (${cached.transactionCount} txs)`);
          console.log(`  On-chain: ${onchain.total.toFixed(2)} TINC (${onchain.count} txs)`);
        } else {
          console.log(`${cached.date}: ⚠ NO ON-CHAIN DATA FOUND`);
        }
      });
      
    } else {
      console.log('API Error:', result);
    }
  });
}).on('error', err => console.error('Error:', err));