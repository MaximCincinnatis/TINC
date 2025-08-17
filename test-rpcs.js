require('dotenv').config();
const RPC_ENDPOINTS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://rpc.ankr.com/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://eth.drpc.org",
  "https://cloudflare-eth.com"
];

async function testRPC(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      })
    });
    
    const data = await response.json();
    if (data.error) {
      return { endpoint, status: 'error', message: data.error.message };
    }
    
    const blockNumber = parseInt(data.result, 16);
    return { endpoint, status: 'ok', blockNumber };
  } catch (error) {
    return { endpoint, status: 'failed', message: error.message };
  }
}

async function testAll() {
  console.log('Testing RPC endpoints...\n');
  
  for (const endpoint of RPC_ENDPOINTS) {
    const result = await testRPC(endpoint);
    if (result.status === 'ok') {
      console.log(`✓ ${result.endpoint} - Block: ${result.blockNumber}`);
    } else {
      console.log(`✗ ${result.endpoint} - ${result.message || result.status}`);
    }
  }
}

testAll();