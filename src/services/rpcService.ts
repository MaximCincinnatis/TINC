const RPC_ENDPOINTS = [
  "https://cloudflare-eth.com",
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com", 
  "https://1rpc.io/eth",
  "https://ethereum.blockpi.network/v1/rpc/public",
  "https://eth-mainnet.public.blastapi.io",
  "https://ethereum.rpc.subquery.network/public",
  "https://eth.api.onfinality.io/public", 
  "https://rpc.payload.de",
  "https://mainnet.gateway.tenderly.co",
  "https://rpc.flashbots.net",
  "https://api.mycryptoapi.com/eth",
  "https://eth-rpc.gateway.pokt.network"
];

let currentEndpointIndex = 0;

// Add retry tracking and health monitoring
const endpointHealth = new Map<string, { failures: number; lastSuccess: number }>();

export async function callRPC(method: string, params: any[], timeout = 8000): Promise<any> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    const endpoint = RPC_ENDPOINTS[(currentEndpointIndex + i) % RPC_ENDPOINTS.length];
    
    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TINC-Burn-Tracker/1.0'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message} (Code: ${data.error.code})`);
      }
      
      // Update health tracking
      const health = endpointHealth.get(endpoint) || { failures: 0, lastSuccess: 0 };
      health.failures = 0;
      health.lastSuccess = Date.now();
      endpointHealth.set(endpoint, health);
      
      // Update current endpoint to successful one
      currentEndpointIndex = (currentEndpointIndex + i) % RPC_ENDPOINTS.length;
      return data.result;
      
    } catch (error) {
      lastError = error as Error;
      
      // Update failure tracking
      const health = endpointHealth.get(endpoint) || { failures: 0, lastSuccess: 0 };
      health.failures++;
      endpointHealth.set(endpoint, health);
      
      console.warn(`RPC error with ${endpoint} (attempt ${i + 1}/${RPC_ENDPOINTS.length}):`, error instanceof Error ? error.message : error);
      
      // Small delay before trying next endpoint
      if (i < RPC_ENDPOINTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  throw lastError || new Error('All RPC endpoints failed after exhaustive retry');
}

export async function getBlockNumber(): Promise<number> {
  const result = await callRPC('eth_blockNumber', []);
  return parseInt(result, 16);
}

export async function getLogs(filter: any): Promise<any[]> {
  return await callRPC('eth_getLogs', [filter]);
}

export async function getTotalSupply(contractAddress: string): Promise<string> {
  // totalSupply() function signature
  const data = '0x18160ddd';
  
  const result = await callRPC('eth_call', [
    {
      to: contractAddress,
      data: data
    },
    'latest'
  ]);
  
  return result;
}

export async function getContractDecimals(contractAddress: string): Promise<number> {
  // decimals() function signature  
  const data = '0x313ce567';
  
  const result = await callRPC('eth_call', [
    {
      to: contractAddress,
      data: data
    },
    'latest'
  ]);
  
  return parseInt(result, 16);
}

// TINC emission rate is fixed at 1 TINC/second
export async function getEmissionRate(contractAddress: string): Promise<{ emissionPerSecond: number; samplePeriod: number }> {
  // TINC has a fixed emission rate of 1 TINC/second = 86,400 TINC/day
  return {
    emissionPerSecond: 1.0,
    samplePeriod: 86400
  };
}

// Function to get RPC health status
export function getRPCHealth(): { endpoint: string; failures: number; lastSuccess: number }[] {
  return RPC_ENDPOINTS.map(endpoint => {
    const health = endpointHealth.get(endpoint) || { failures: 0, lastSuccess: 0 };
    return { endpoint, ...health };
  });
}