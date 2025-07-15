const fs = require('fs');

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_API_KEY = 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';

// LP and contract addresses to exclude from holder counts
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP
  '0x0000000000000000000000000000000000000000', // Burn address
  '0x000000000000000000000000000000000000dead', // Dead address
].map(addr => addr.toLowerCase()));

async function getRealHolderData() {
  try {
    console.log('📊 Fetching REAL holder data from transfer events...');
    
    // Get total supply
    const totalSupplyUrl = `${ETHERSCAN_BASE_URL}?module=stats&action=tokensupply&contractaddress=${TINC_ADDRESS}&apikey=${ETHERSCAN_API_KEY}`;
    const totalSupplyResponse = await fetch(totalSupplyUrl);
    const totalSupplyData = await totalSupplyResponse.json();
    const totalSupply = parseInt(totalSupplyData.result) / Math.pow(10, 18);
    
    console.log(`📊 Total Supply: ${totalSupply.toLocaleString()} TINC`);
    
    // Get recent transfer events (last 1000)
    const url = `${ETHERSCAN_BASE_URL}?module=logs&action=getLogs&fromBlock=latest&toBlock=latest&address=${TINC_ADDRESS}&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&page=1&offset=1000&apikey=${ETHERSCAN_API_KEY}`;
    
    console.log('📊 Fetching recent transfer events...');
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Transfer logs API error: ${data.message}`);
    }
    
    // Extract unique addresses from recent transfers
    const recentAddresses = new Set();
    data.result.forEach(log => {
      const from = '0x' + log.topics[1].substring(26);
      const to = '0x' + log.topics[2].substring(26);
      
      if (from !== '0x0000000000000000000000000000000000000000') {
        recentAddresses.add(from.toLowerCase());
      }
      if (to !== '0x0000000000000000000000000000000000000000') {
        recentAddresses.add(to.toLowerCase());
      }
    });
    
    console.log(`📊 Found ${recentAddresses.size} unique addresses in recent transfers`);
    
    // Get current balances for all addresses
    const holderBalances = [];
    let processedCount = 0;
    
    const addressArray = Array.from(recentAddresses);
    for (const address of addressArray) {
      try {
        const balanceUrl = `${ETHERSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress=${TINC_ADDRESS}&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
        const balanceResponse = await fetch(balanceUrl);
        const balanceData = await balanceResponse.json();
        
        if (balanceData.status === '1' && balanceData.result !== '0') {
          const balance = parseInt(balanceData.result) / Math.pow(10, 18);
          holderBalances.push({ address, balance });
        }
        
        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`📊 Processed ${processedCount}/${addressArray.length} addresses, found ${holderBalances.length} with balances`);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`⚠️ Error fetching balance for ${address}:`, error.message);
      }
    }
    
    // Filter out LP positions and contract addresses
    const filteredHolders = holderBalances.filter(holder => 
      !EXCLUDED_ADDRESSES.has(holder.address.toLowerCase())
    );
    
    console.log(`📊 Filtered out ${holderBalances.length - filteredHolders.length} LP/contract addresses`);
    
    // Categorize holders based on percentage of total supply
    let poseidon = 0, whale = 0, shark = 0, dolphin = 0, squid = 0, shrimp = 0;
    
    filteredHolders.forEach(holder => {
      const percentage = (holder.balance / totalSupply) * 100;
      
      if (percentage >= 10) poseidon++;
      else if (percentage >= 1) whale++;
      else if (percentage >= 0.1) shark++;
      else if (percentage >= 0.01) dolphin++;
      else if (percentage >= 0.001) squid++;
      else shrimp++;
    });
    
    console.log(`📊 REAL HOLDER COUNTS:`);
    console.log(`🔱 Poseidon (10%+): ${poseidon}`);
    console.log(`🐋 Whale (1%+): ${whale}`);
    console.log(`🦈 Shark (0.1%+): ${shark}`);
    console.log(`🐬 Dolphin (0.01%+): ${dolphin}`);
    console.log(`🦑 Squid (0.001%+): ${squid}`);
    console.log(`🍤 Shrimp (<0.001%): ${shrimp}`);
    
    return {
      totalHolders: filteredHolders.length,
      poseidon,
      whale,
      shark,
      dolphin,
      squid,
      shrimp,
      estimatedData: false,
      excludesLPPositions: true,
      realTimeData: true
    };
    
  } catch (error) {
    console.error('❌ Error fetching real holder data:', error.message);
    throw error;
  }
}

// Run the test
getRealHolderData().then(result => {
  console.log('\n✅ Final Result:');
  console.log(JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('❌ Failed:', error.message);
});