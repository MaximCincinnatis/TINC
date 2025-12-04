require('dotenv').config();

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

async function quickTest() {
  console.log('📊 Testing Moralis API...');
  
  const url = `${MORALIS_BASE_URL}/erc20/${TINC_ADDRESS}/owners?chain=eth&limit=5`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': MORALIS_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Moralis error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Moralis API working');
  console.log('   Holders fetched:', data.result.length);
  console.log('   Top holder balance:', parseFloat(data.result[0].balance_formatted).toLocaleString(), 'TINC');
  console.log('✅ Implementation verified');
}

quickTest().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
