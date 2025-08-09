#!/usr/bin/env node

/**
 * Script to clean holder data by removing LP and excluded addresses
 * This will fix the current data and ensure accurate holder statistics
 */

const fs = require('fs');
const path = require('path');
const { EXCLUDED_ADDRESSES } = require('./excluded-addresses');

function cleanHolderData() {
  console.log('🧹 Cleaning holder data - removing LP and excluded addresses...\n');
  
  // Load current cached data
  const cachePath = path.join(__dirname, '../data/cache/holder-data.json');
  const burnDataPath = path.join(__dirname, '../data/burn-data.json');
  
  if (!fs.existsSync(cachePath)) {
    console.error('❌ No holder cache found at:', cachePath);
    return;
  }
  
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const burnData = fs.existsSync(burnDataPath) 
    ? JSON.parse(fs.readFileSync(burnDataPath, 'utf8'))
    : null;
  
  console.log(`📊 Current data:`);
  console.log(`  Total holders: ${cache.totalHolders}`);
  console.log(`  Total supply: ${cache.totalSupply.toLocaleString()} TINC`);
  
  // Check if LP address is in the holder list
  const lpAddress = '0x72e0de1cc2c952326738dac05bacb9e9c25422e3';
  const lpHolder = cache.holders.find(h => h.address.toLowerCase() === lpAddress);
  
  if (lpHolder) {
    console.log(`\n⚠️  Found LP address in holder list:`);
    console.log(`  Address: ${lpAddress}`);
    console.log(`  Balance: ${lpHolder.balance.toLocaleString()} TINC`);
    console.log(`  % of supply: ${(lpHolder.balance / cache.totalSupply * 100).toFixed(2)}%`);
  }
  
  // Filter out excluded addresses
  const originalCount = cache.holders.length;
  const filteredHolders = cache.holders.filter(holder => 
    !EXCLUDED_ADDRESSES.has(holder.address.toLowerCase())
  );
  
  const removedCount = originalCount - filteredHolders.length;
  console.log(`\n🔄 Filtering results:`);
  console.log(`  Original holders: ${originalCount}`);
  console.log(`  Excluded addresses: ${removedCount}`);
  console.log(`  Final holders: ${filteredHolders.length}`);
  
  // Recalculate categories
  const totalSupply = cache.totalSupply;
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
  
  // Calculate top 10 percentage (without LP)
  const sortedHolders = [...filteredHolders].sort((a, b) => b.balance - a.balance);
  const top10Balance = sortedHolders.slice(0, 10).reduce((sum, h) => sum + h.balance, 0);
  const top10Percentage = (top10Balance / totalSupply) * 100;
  
  console.log(`\n📊 Updated holder categories:`);
  console.log(`  🔱 Poseidon (10%+): ${poseidon}`);
  console.log(`  🐋 Whale (1%+): ${whale}`);
  console.log(`  🦈 Shark (0.1%+): ${shark}`);
  console.log(`  🐬 Dolphin (0.01%+): ${dolphin}`);
  console.log(`  🦑 Squid (0.001%+): ${squid}`);
  console.log(`  🍤 Shrimp (<0.001%): ${shrimp}`);
  console.log(`  📈 Top 10 holders: ${top10Percentage.toFixed(2)}% of supply`);
  
  // Update the cache
  const updatedCache = {
    ...cache,
    totalHolders: filteredHolders.length,
    holders: sortedHolders // Keep sorted order
  };
  
  // Save updated cache
  fs.writeFileSync(cachePath, JSON.stringify(updatedCache, null, 2));
  console.log(`\n✅ Updated holder cache saved`);
  
  // Update burn data if it exists
  if (burnData) {
    const updatedBurnData = {
      ...burnData,
      holderStats: {
        totalHolders: filteredHolders.length,
        poseidon,
        whale,
        shark,
        dolphin,
        squid,
        shrimp,
        top10Percentage,
        dataSource: 'blockchain-cleaned',
        lastUpdate: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(burnDataPath, JSON.stringify(updatedBurnData, null, 2));
    
    // Also update public data if it exists
    const publicPath = path.join(__dirname, '../public/data/burn-data.json');
    if (fs.existsSync(publicPath)) {
      fs.writeFileSync(publicPath, JSON.stringify(updatedBurnData, null, 2));
    }
    
    console.log(`✅ Updated burn data with cleaned holder stats`);
  }
  
  console.log('\n🎉 Holder data successfully cleaned!');
  console.log('LP positions are now properly excluded from statistics.');
}

// Run the cleaner
cleanHolderData();