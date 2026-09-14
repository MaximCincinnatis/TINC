export interface DailyBurn {
  date: string;
  amountTinc: number;
  transactionCount: number;
  transactions: {
    hash: string;
    amount: number;
    from: string;
  }[];
  // 2026-09-09: mints (transfers from the zero address); zero on days without a harvest
  mintedTinc?: number;
  mintEvents?: { hash: string; index: number; amount: number }[];
}

export interface HolderStats {
  totalHolders: number;
  poseidon: number;
  whale: number;
  shark: number;
  dolphin: number;
  squid: number;
  shrimp: number;
  top10Percentage?: number;
  estimatedData?: boolean;
}

// 2026-09-14: the buy-and-burn's per-token settings and the protocol fee's collections, read at every update
export interface BuyAndBurnSetting {
  token: string;
  address: string;
  state: 'active' | 'paused';
  callerCutPercent: number;
  burnedAsItselfPercent: number;
  swappedPercent: number;
  waiting: number;
}

export interface ProtocolFeeCollected {
  totals: { token: string; symbol: string; decimals: number; amount: number }[];
  transactions: number;
  events: number;
  firstCollectedAt: string | null;
  lastCollectedAt: string | null;
  lastCollectedBy: string | null;
  collectionsByLast: number;
  soleCollectorSince: string | null;
  scannedToBlock: number | null;
}

export interface BurnData {
  startDate: string;
  endDate: string;
  totalBurned: number;
  totalSupply: number;
  burnPercentage: number;
  emissionPerSecond: number;
  emissionSamplePeriod: number;
  isDeflationary: boolean;
  // 2026-09-01: like-for-like window figures behind isDeflationary (optional: older snapshots lack them)
  periodDays?: number;
  periodEmission?: number;
  deflationaryDays?: number;
  netSupplyChange?: number;
  // 2026-09-09: chain readings beside the schedule; minted - burned = the change in totalSupply
  mintedInWindow?: number;
  supplyChange?: number;
  poolShare?: number | null;
  tincPools?: { address: string; pair: string }[];
  activeInputTokens?: string[];
  pausedInputTokens?: string[];
  protocolFeeMaxPercent?: number | null;
  protocolFactsAt?: string | null;
  protocolFeeMinPercent?: number | null;
  buyAndBurnSettings?: BuyAndBurnSetting[];
  protocolFeeCollected?: ProtocolFeeCollected | null;
  protocolFeeCollectedStale?: boolean;
  dailyBurns: DailyBurn[];
  fetchedAt: string;
  fromCache?: boolean;
  holderStats?: HolderStats;
}