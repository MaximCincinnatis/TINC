import { BurnData, DailyBurn } from '../types/BurnData';
import { getBlockNumber, getLogs, callRPC, getTotalSupply, getEmissionRate } from './rpcService';
import { ethers } from 'ethers';

const TINC_ADDRESS = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
// Zero address properly padded to 32 bytes (64 hex chars) for topic filtering
const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
const AVG_BLOCK_TIME = 12; // seconds
const CHUNK_SIZE = 500; // Reduced chunk size for better RPC compatibility

// Verify the zero address topic calculation
console.log('Zero address topic:', ZERO_ADDRESS_TOPIC);
console.log('Transfer topic:', TRANSFER_TOPIC);

interface CachedData {
  data: BurnData;
  timestamp: number;
}

let cache: CachedData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Progress callback
let progressCallback: ((message: string, progress?: number) => void) | null = null;

export function setProgressCallback(callback: (message: string, progress?: number) => void) {
  progressCallback = callback;
}

async function getBlockTimestamp(blockNumber: string | number): Promise<number> {
  const block = await callRPC('eth_getBlockByNumber', [
    typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber,
    false
  ]);
  return parseInt(block.timestamp, 16);
}

async function estimateBlockByTimestamp(timestamp: number): Promise<number> {
  const currentBlock = await getBlockNumber();
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - timestamp;
  const blocksDiff = Math.floor(timeDiff / AVG_BLOCK_TIME);
  return Math.max(1, currentBlock - blocksDiff);
}

export async function fetchBurnData(forceRefresh = false): Promise<BurnData> {
  // Check cache
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return { ...cache.data, fromCache: true };
  }

  progressCallback?.('Initializing burn data fetch...', 0);

  // Fetch total supply first
  progressCallback?.('Fetching TINC total supply...', 2);
  const totalSupplyHex = await getTotalSupply(TINC_ADDRESS);
  const totalSupply = parseFloat(ethers.formatEther(totalSupplyHex));

  const endTime = new Date();
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 30); // 30 days

  const currentBlock = await getBlockNumber();
  const startBlock = await estimateBlockByTimestamp(Math.floor(startTime.getTime() / 1000));

  console.log(`Fetching burns from block ${startBlock} to ${currentBlock}`);
  progressCallback?.(`Scanning ${currentBlock - startBlock} blocks for TINC burns...`, 5);

  const allBurns: any[] = [];
  const totalChunks = Math.ceil((currentBlock - startBlock) / CHUNK_SIZE);
  let chunksProcessed = 0;

  // Fetch in chunks
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    
    try {
      const progress = 5 + (chunksProcessed / totalChunks) * 85;
      progressCallback?.(
        `Fetching blocks ${fromBlock} to ${toBlock}...`,
        progress
      );

      const logs = await getLogs({
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        address: TINC_ADDRESS,
        topics: [
          TRANSFER_TOPIC,
          null, // from address (any)
          ZERO_ADDRESS_TOPIC // to address (0x0)
        ]
      });

      // Process each log and get block timestamp
      for (const log of logs) {
        const amount = ethers.toBigInt(log.data);
        const amountTinc = parseFloat(ethers.formatEther(amount));
        
        // Get block timestamp
        const timestamp = await getBlockTimestamp(log.blockNumber);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        
        allBurns.push({
          transactionHash: log.transactionHash,
          blockNumber: parseInt(log.blockNumber, 16),
          timestamp,
          date,
          amountTinc,
          fromAddress: `0x${log.topics[1].slice(26)}`
        });
      }

      chunksProcessed++;
      console.log(`Found ${logs.length} burns in blocks ${fromBlock}-${toBlock}`);
    } catch (error) {
      console.error(`Error fetching chunk ${fromBlock}-${toBlock}:`, error);
      // Continue with next chunk
    }
  }

  progressCallback?.('Processing burn data...', 90);

  // Aggregate by day
  const dailyBurns: { [date: string]: DailyBurn } = {};
  let totalBurned = 0;

  // Initialize all days with zero burns
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyBurns[dateStr] = {
      date: dateStr,
      amountTinc: 0,
      transactionCount: 0,
      transactions: []
    };
  }

  // Add actual burn data
  for (const burn of allBurns) {
    const { date, amountTinc, transactionHash, fromAddress } = burn;
    
    if (dailyBurns[date]) {
      dailyBurns[date].amountTinc += amountTinc;
      dailyBurns[date].transactionCount += 1;
      dailyBurns[date].transactions.push({
        hash: transactionHash,
        amount: amountTinc,
        from: fromAddress
      });

      totalBurned += amountTinc;
    }
  }

  const sortedDates = Object.keys(dailyBurns).sort();
  const dailyData = sortedDates.map(date => dailyBurns[date]);

  progressCallback?.('Calculating emission rate...', 95);

  // Get current emission rate
  const emissionData = await getEmissionRate(TINC_ADDRESS);
  const dailyEmission = emissionData.emissionPerSecond * 86400; // 86400 seconds in a day
  const isDeflationary = totalBurned > dailyEmission;

  progressCallback?.('Finalizing data...', 98);

  const burnPercentage = totalSupply > 0 ? (totalBurned / totalSupply) * 100 : 0;

  const burnData: BurnData = {
    startDate: startTime.toISOString().split('T')[0],
    endDate: endTime.toISOString().split('T')[0],
    totalBurned,
    totalSupply,
    burnPercentage,
    emissionPerSecond: emissionData.emissionPerSecond,
    emissionSamplePeriod: emissionData.samplePeriod,
    isDeflationary,
    dailyBurns: dailyData,
    fetchedAt: new Date().toISOString()
  };

  // Update cache
  cache = {
    data: burnData,
    timestamp: Date.now()
  };

  progressCallback?.('Complete!', 100);

  return burnData;
}