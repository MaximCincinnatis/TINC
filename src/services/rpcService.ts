// Local Ethereum node - no rate limits, full access
const RPC_ENDPOINT = "http://192.168.0.73:18545";

export async function callRPC(method: string, params: any[], timeout = 8000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(RPC_ENDPOINT, {
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

    return data.result;

  } catch (error) {
    clearTimeout(timeoutId);
    throw error instanceof Error ? error : new Error('RPC call failed');
  }
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

