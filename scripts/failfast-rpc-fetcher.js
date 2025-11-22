require('dotenv').config();

/**
 * FAILFAST RPC FETCHER
 * =====================
 * All or nothing. Infinite retry. Never continues on failure.
 *
 * Core Principle:
 * - If ANY RPC call fails, retry forever with exponential backoff
 * - Backoff: 1s → 2s → 4s → 8s → ... → 10min (max)
 * - After max backoff, retry every 10 minutes FOREVER
 * - NEVER skip blocks, NEVER continue on failure
 * - Only exit on success
 *
 * Why Failfast?
 * - Prevents data gaps from RPC failures
 * - Ensures 100% block scan completion
 * - No silent failures, no partial results
 */
class FailfastRPCFetcher {
  constructor(rpcEndpoint) {
    this.rpcEndpoint = rpcEndpoint;
    this.MAX_BACKOFF = 600000; // 10 minutes in milliseconds
  }

  /**
   * Fetch with infinite retry and exponential backoff
   * @param {Function} fetchFunction - Async function to execute
   * @param {String} description - Human-readable description for logging
   * @returns {Promise} - ALWAYS resolves (never rejects - retries forever)
   */
  async fetchWithInfiniteRetry(fetchFunction, description) {
    let attempt = 1;

    while (true) { // INFINITE LOOP - NEVER EXITS ON FAILURE
      try {
        const result = await fetchFunction();

        if (attempt > 1) {
          console.log(`✅ ${description} SUCCESS after ${attempt} attempts`);
        }
        return result; // ONLY EXIT POINT: SUCCESS

      } catch (error) {
        console.error(`❌ ${description} attempt ${attempt} FAILED: ${error.message}`);

        // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s, ..., max 10min
        const exponentialBackoff = 1000 * Math.pow(2, attempt - 1);
        const backoffMs = Math.min(exponentialBackoff, this.MAX_BACKOFF);

        const backoffSec = (backoffMs / 1000).toFixed(0);
        const backoffMin = (backoffMs / 60000).toFixed(1);

        if (backoffMs >= this.MAX_BACKOFF) {
          console.log(`⏳ Retrying in ${backoffMin} minutes (max backoff reached)`);
          console.log(`🔄 FAILFAST MODE: Will retry every 10 min FOREVER until success`);
        } else {
          console.log(`⏳ Retrying in ${backoffSec}s...`);
          console.log(`🔄 FAILFAST MODE: Will retry FOREVER until success (no skip)`);
        }

        await new Promise(resolve => setTimeout(resolve, backoffMs));
        attempt++;
        // Loop continues - NO BREAK, NO RETURN ON FAILURE
      }
    }
  }

  /**
   * Call RPC with infinite retry
   * @param {String} method - RPC method name
   * @param {Array} params - RPC method parameters
   * @returns {Promise} - RPC result (retries forever if fails)
   */
  async callRPC(method, params) {
    return this.fetchWithInfiniteRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(this.rpcEndpoint, {
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
            throw new Error(data.error.message || 'Unknown RPC error');
          }

          return data.result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error; // Will be caught by fetchWithInfiniteRetry
        }
      },
      `RPC ${method}`
    );
  }

  /**
   * Get current block number with infinite retry
   */
  async getBlockNumber() {
    const result = await this.callRPC('eth_blockNumber', []);
    return parseInt(result, 16);
  }

  /**
   * Get block timestamp with infinite retry
   */
  async getBlockTimestamp(blockNumber) {
    const block = await this.callRPC('eth_getBlockByNumber', [
      typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber,
      false
    ]);
    return parseInt(block.timestamp, 16);
  }

  /**
   * Fetch logs with infinite retry
   */
  async getLogs(params) {
    return this.callRPC('eth_getLogs', [params]);
  }

  /**
   * Call contract method with infinite retry
   */
  async callContract(to, data) {
    return this.callRPC('eth_call', [{ to, data }, 'latest']);
  }
}

module.exports = FailfastRPCFetcher;
