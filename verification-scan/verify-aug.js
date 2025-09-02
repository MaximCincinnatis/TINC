const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function scanForBurns() {
  console.log('🔍 Verification Scan for Aug 25-28 TINC Burns');
  console.log('==============================================\n');
  
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
  
  // Scan specific ranges for Aug 25-28
  const ranges = [
    { date: '2025-08-25', blocks: [23214800, 23215600] }, // Where we know burns exist
    { date: '2025-08-26', blocks: [23222200, 23229599] },
    { date: '2025-08-27', blocks: [23229600, 23236999] },
    { date: '2025-08-28', blocks: [23237000, 23244000] }
  ];
  
  const results = {};
  
  for (const range of ranges) {
    console.log(`📅 Scanning ${range.date}...`);
    console.log(`   Blocks ${range.blocks[0]} to ${range.blocks[1]}`);
    
    try {
      const events = await contract.getPastEvents('Transfer', {
        filter: { to: ZERO_ADDRESS },
        fromBlock: range.blocks[0],
        toBlock: range.blocks[1]
      });
      
      const burns = [];
      let totalBurned = 0;
      
      for (const event of events) {
        const amount = parseFloat(web3.utils.fromWei(event.returnValues.value, 'ether'));
        burns.push({
          block: event.blockNumber,
          hash: event.transactionHash,
          from: event.returnValues.from,
          amount: amount
        });
        totalBurned += amount;
        
        console.log(`   ✅ Block ${event.blockNumber}: ${amount.toFixed(2)} TINC`);
        console.log(`      Hash: ${event.transactionHash}`);
      }
      
      results[range.date] = {
        count: burns.length,
        total: totalBurned,
        burns: burns
      };
      
      if (burns.length === 0) {
        console.log(`   ℹ️ No burns found in this range`);
      } else {
        console.log(`   📊 Total: ${burns.length} burns, ${totalBurned.toFixed(2)} TINC`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results[range.date] = { error: error.message };
    }
    
    console.log('');
  }
  
  // Save results
  fs.writeFileSync('aug-verification-results.json', JSON.stringify(results, null, 2));
  
  // Compare with existing
  console.log('📊 COMPARISON WITH EXISTING DATA:');
  console.log('==================================');
  
  const existing = JSON.parse(fs.readFileSync('../data/burn-data.json'));
  
  for (const date of Object.keys(results)) {
    const ourDay = existing.dailyBurns.find(d => d.date === date);
    const verifiedDay = results[date];
    
    if (!verifiedDay.error) {
      console.log(`${date}:`);
      console.log(`  Existing: ${ourDay ? ourDay.transactionCount : 0} burns, ${ourDay ? ourDay.amountTinc.toFixed(2) : '0'} TINC`);
      console.log(`  Verified: ${verifiedDay.count} burns, ${verifiedDay.total.toFixed(2)} TINC`);
      console.log(`  Match: ${ourDay && ourDay.transactionCount === verifiedDay.count ? '✅' : '❌'}`);
    }
  }
}

scanForBurns().catch(console.error);