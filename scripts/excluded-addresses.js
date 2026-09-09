require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Centralized configuration for addresses to exclude from holder statistics
// This ensures consistency across all scripts

// The burn addresses and the pools known at launch. Pools are no longer the whole story:
// protocol-facts.js reads the farm list from the FarmKeeper at every update and writes every
// pool that holds TINC to data/cache/tinc-pools.json, so a farm added later is excluded
// automatically (2026-09-09, Ben: "if new pools are added or removed this will be accurate?").
const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP on Uniswap
  '0xf89980f60e55633d05e72881ceb866dbb7f50580', // Second TINC LP
  '0x0000000000000000000000000000000000000000', // Burn address (zero address)
  '0x000000000000000000000000000000000000dead', // Dead address
].map(addr => addr.toLowerCase()));

const POOLS_FILE = path.join(__dirname, '..', 'data', 'cache', 'tinc-pools.json');

// The static set plus every TINC pool the last update found on chain
function excludedAddresses() {
  const merged = new Set(EXCLUDED_ADDRESSES);
  try {
    const cached = JSON.parse(fs.readFileSync(POOLS_FILE, 'utf8'));
    for (const pool of cached.pools || []) {
      if (pool && pool.address) merged.add(String(pool.address).toLowerCase());
    }
  } catch {
    // no cache yet (first run) - the static set applies
  }
  return merged;
}

// Helper function to check if an address should be excluded
function isExcludedAddress(address) {
  return excludedAddresses().has(address.toLowerCase());
}

// Helper function to filter out excluded addresses from a list
function filterExcludedAddresses(addresses) {
  const excluded = excludedAddresses();
  return addresses.filter(addr => !excluded.has(addr.toLowerCase()));
}

module.exports = {
  EXCLUDED_ADDRESSES,
  POOLS_FILE,
  excludedAddresses,
  isExcludedAddress,
  filterExcludedAddresses
};
