// Quick test for holder data fetching
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';
const ETHERSCAN_API_KEY = 'YourApiKeyToken';

async function testHolderData() {
  try {
    console.log('📊 Testing holder data fetch...');
    
    const url = `${ETHERSCAN_BASE_URL}?module=token&action=tokenholderlist&contractaddress=${TINC_ADDRESS}&page=1&offset=10000&apikey=${ETHERSCAN_API_KEY}`;
    
    console.log('🔗 URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📋 Response status:', data.status);
    console.log('📄 Response message:', data.message);
    
    if (data.status === '1' && data.result) {
      console.log('👥 Total holders found:', data.result.length);
      console.log('🔝 Top 3 holders:');
      data.result.slice(0, 3).forEach((holder, i) => {
        console.log(`  ${i+1}. ${holder.TokenHolderAddress}: ${parseFloat(holder.TokenHolderQuantity).toLocaleString()} TINC`);
      });
      
      // Quick categorization test
      let poseidon = 0, whale = 0, shark = 0, others = 0;
      const totalSupply = 14164527; // Approximate
      
      data.result.forEach(holder => {
        const balance = parseFloat(holder.TokenHolderQuantity);
        const percentage = (balance / totalSupply) * 100;
        
        if (percentage >= 10) poseidon++;
        else if (percentage >= 1) whale++;
        else if (percentage >= 0.1) shark++;
        else others++;
      });
      
      console.log('🏆 Categories:');
      console.log(`  🔱 Poseidon (10%+): ${poseidon}`);
      console.log(`  🐋 Whale (1%+): ${whale}`);
      console.log(`  🦈 Shark (0.1%+): ${shark}`);
      console.log(`  🐠 Others: ${others}`);
      
    } else {
      console.log('❌ API Error or no data');
      console.log('📝 Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testHolderData();