// Centralized configuration for addresses to exclude from holder statistics
// This ensures consistency across all scripts

const EXCLUDED_ADDRESSES = new Set([
  '0x72e0de1cc2c952326738dac05bacb9e9c25422e3', // TINC/TitanX LP on Uniswap
  '0xf89980f60e55633d05e72881ceb866dbb7f50580', // Second TINC LP 
  '0x0000000000000000000000000000000000000000', // Burn address (zero address)
  '0x000000000000000000000000000000000000dead', // Dead address
  // Add other LP or contract addresses here as needed
].map(addr => addr.toLowerCase()));

// Helper function to check if an address should be excluded
function isExcludedAddress(address) {
  return EXCLUDED_ADDRESSES.has(address.toLowerCase());
}

// Helper function to filter out excluded addresses from a list
function filterExcludedAddresses(addresses) {
  return addresses.filter(addr => !isExcludedAddress(addr));
}

module.exports = {
  EXCLUDED_ADDRESSES,
  isExcludedAddress,
  filterExcludedAddresses
};