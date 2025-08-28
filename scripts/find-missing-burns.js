const fs = require('fs');
const axios = require('axios');

const TINC_TOKEN = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';

async function findMissingBurns() {
  console.log('🔍 Finding what burns we\'re missing\n');
  
  // Load our recorded burns
  const ourData = JSON.parse(fs.readFileSync('public/data/burn-data.json', 'utf8'));
  const ourBurns = new Set();
  ourData.dailyBurns.forEach(day => {
    day.transactions.forEach(tx => {
      ourBurns.add(tx.hash.toLowerCase());
    });
  });
  
  console.log(`📊 We have ${ourBurns.size} burns recorded\n`);
  
  // Get ALL transfers involving burn-related addresses
  const startBlock = 23100000; // ~Aug 10
  const endBlock = 23242000;
  
  // Get transfers FROM UniversalBuyAndBurn TO 0x0
  const url1 = `https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=${startBlock}&toBlock=${endBlock}&address=${TINC_TOKEN}&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&topic1=0x000000000000000000000000060e990a7e760f211447e76a53ff6e1be2f3bdd3&topic2=0x0000000000000000000000000000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
  
  console.log('Fetching burns FROM UniversalBuyAndBurn TO 0x0...');
  const response1 = await axios.get(url1);
  
  let universalBurns = [];
  if (response1.data.status === '1') {
    universalBurns = response1.data.result.map(log => ({
      hash: log.transactionHash,
      from: 'UniversalBuyAndBurn',
      to: '0x0',
      block: parseInt(log.blockNumber, 16)
    }));
  }
  
  console.log(`Found ${universalBurns.length} burns from UniversalBuyAndBurn to 0x0\n`);
  
  // Check which ones we're missing
  const missing = universalBurns.filter(burn => !ourBurns.has(burn.hash.toLowerCase()));
  
  console.log('═══════════════════════════════════════════');
  console.log('           MISSING BURNS ANALYSIS           ');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`❌ Missing ${missing.length} out of ${universalBurns.length} UniversalBuyAndBurn burns`);
  console.log(`📊 Capture rate: ${((universalBurns.length - missing.length) / universalBurns.length * 100).toFixed(1)}%\n`);
  
  if (missing.length > 0) {
    console.log('Sample of missing burns:');
    missing.slice(0, 10).forEach(burn => {
      console.log(`  • ${burn.hash} (block ${burn.block})`);
    });
    
    // Check if there's a pattern in block numbers
    const ourBlocks = new Set();
    ourData.dailyBurns.forEach(day => {
      day.transactions.forEach(tx => {
        ourBlocks.add(tx.blockNumber);
      });
    });
    
    const minOurBlock = Math.min(...ourBlocks);
    const maxOurBlock = Math.max(...ourBlocks);
    
    console.log(`\n📊 Block range analysis:`);
    console.log(`  Our data: blocks ${minOurBlock} to ${maxOurBlock}`);
    console.log(`  Missing burns block range: ${Math.min(...missing.map(b => b.block))} to ${Math.max(...missing.map(b => b.block))}`);
    
    // Check if missing burns are before our range
    const beforeOurRange = missing.filter(b => b.block < minOurBlock).length;
    const afterOurRange = missing.filter(b => b.block > maxOurBlock).length;
    const withinOurRange = missing.filter(b => b.block >= minOurBlock && b.block <= maxOurBlock).length;
    
    console.log(`\n📍 Missing burns location:`);
    console.log(`  Before our range: ${beforeOurRange}`);
    console.log(`  Within our range: ${withinOurRange} ⚠️`);
    console.log(`  After our range: ${afterOurRange}`);
    
    if (withinOurRange > 0) {
      console.log('\n⚠️  CRITICAL: We\'re missing burns within our block range!');
      console.log('This suggests our fetch logic has a bug.');
    }
  }
}

findMissingBurns().catch(console.error);