const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

// LP and contract addresses to exclude
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP
  '0x0000000000000000000000000000000000000000', // Burn address
  '0x000000000000000000000000000000000000dead', // Dead address
].map(addr => addr.toLowerCase()));

async function fetchHolderDataFromMoralis() {
  if (!MORALIS_API_KEY) {
    throw new Error('MORALIS_API_KEY not found in environment variables');
  }

  console.log('🚀 Fetching holder data from Moralis API...');
  
  // Use a fallback total supply from the contract (we know it's around 15M)
  let totalSupply = 15000000; // Fallback value
  
  try {
    // Try to get total supply, but don't fail if it doesn't work
    const totalSupplyResponse = await fetch(`${MORALIS_BASE_URL}/erc20/${TINC_ADDRESS}?chain=eth`, {
      headers: {
        'X-API-Key': MORALIS_API_KEY
      }
    });
    
    if (totalSupplyResponse.ok) {
      const totalSupplyData = await totalSupplyResponse.json();
      if (totalSupplyData.total_supply_formatted) {
        totalSupply = parseFloat(totalSupplyData.total_supply_formatted);
      }
    }
  } catch (error) {
    console.log('⚠️ Could not fetch total supply, using fallback');
  }
  
  console.log(`📊 Total supply: ${totalSupply.toLocaleString()} TINC`);
  
  // Fetch all holders
  const allHolders = [];
  let cursor = null;
  let page = 1;
  
  do {
    const url = `${MORALIS_BASE_URL}/erc20/${TINC_ADDRESS}/owners?chain=eth&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': MORALIS_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      allHolders.push(...data.result);
      console.log(`📊 Page ${page}: Found ${data.result.length} holders, total: ${allHolders.length}`);
    }
    
    cursor = data.cursor;
    page++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
  } while (cursor && page <= 50); // Safety limit of 50 pages (5000 holders max)
  
  console.log(`📊 Total holders found: ${allHolders.length}`);
  
  // Filter out LP positions and contract addresses
  const filteredHolders = allHolders.filter(holder => 
    !EXCLUDED_ADDRESSES.has(holder.owner_address.toLowerCase()) && 
    parseFloat(holder.balance_formatted) > 0
  );
  
  console.log(`📊 Filtered out ${allHolders.length - filteredHolders.length} LP/contract/zero balance addresses`);
  
  // Sort holders by balance to find top 10
  const sortedHolders = [...filteredHolders].sort((a, b) => 
    parseFloat(b.balance_formatted) - parseFloat(a.balance_formatted)
  );
  
  // Calculate top 10 holders' combined percentage
  const top10Holders = sortedHolders.slice(0, 10);
  const top10Balance = top10Holders.reduce((sum, holder) => 
    sum + parseFloat(holder.balance_formatted), 0
  );
  const top10Percentage = (top10Balance / totalSupply) * 100;
  
  console.log(`📊 Top 10 holders own: ${top10Percentage.toFixed(2)}% of total supply`);
  
  // Categorize holders based on percentage of total supply
  let poseidon = 0, whale = 0, shark = 0, dolphin = 0, squid = 0, shrimp = 0;
  
  filteredHolders.forEach(holder => {
    const balance = parseFloat(holder.balance_formatted);
    const percentage = (balance / totalSupply) * 100;
    
    if (percentage >= 10) poseidon++;
    else if (percentage >= 1) whale++;
    else if (percentage >= 0.1) shark++;
    else if (percentage >= 0.01) dolphin++;
    else if (percentage >= 0.001) squid++;
    else shrimp++;
  });
  
  console.log(`📊 REAL HOLDER COUNTS (Moralis API):`);
  console.log(`🔱 Poseidon (10%+): ${poseidon}`);
  console.log(`🐋 Whale (1%+): ${whale}`);
  console.log(`🦈 Shark (0.1%+): ${shark}`);
  console.log(`🐬 Dolphin (0.01%+): ${dolphin}`);
  console.log(`🦑 Squid (0.001%+): ${squid}`);
  console.log(`🍤 Shrimp (<0.001%): ${shrimp}`);
  
  const holderStats = {
    totalHolders: filteredHolders.length,
    poseidon,
    whale,
    shark,
    dolphin,
    squid,
    shrimp,
    top10Percentage,
    dataSource: 'moralis',
    lastUpdate: new Date().toISOString(),
    estimatedData: false,
    excludesLPPositions: true,
    realTimeData: true
  };
  
  // Update the burn data JSON with correct holder stats
  const burnDataPath = path.join(__dirname, '../data/burn-data.json');
  if (fs.existsSync(burnDataPath)) {
    const burnData = JSON.parse(fs.readFileSync(burnDataPath, 'utf8'));
    burnData.holderStats = holderStats;
    burnData.totalSupply = totalSupply;
    fs.writeFileSync(burnDataPath, JSON.stringify(burnData, null, 2));
    console.log('✅ Updated burn-data.json with correct holder stats');
  }
  
  // Also save to cache
  const cacheDir = path.join(__dirname, '../data/cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  const cacheData = {
    lastBlock: 23019816, // Current block estimate
    totalSupply,
    totalHolders: filteredHolders.length,
    holders: sortedHolders, // Store ALL holders for proper incremental updates
    holderStats,
    cachedAt: new Date().toISOString()
  };
  
  const cacheFile = path.join(cacheDir, 'holder-data.json');
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  console.log('✅ Saved holder cache with correct data');
  
  return holderStats;
}

// Run the script
fetchHolderDataFromMoralis()
  .then((stats) => {
    console.log('\n🎉 Successfully updated holder data!');
    console.log(`Total holders: ${stats.totalHolders}`);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });