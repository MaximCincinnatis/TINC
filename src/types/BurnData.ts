export interface DailyBurn {
  date: string;
  amountTinc: number;
  transactionCount: number;
  transactions: {
    hash: string;
    amount: number;
    from: string;
  }[];
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
  dailyBurns: DailyBurn[];
  fetchedAt: string;
  fromCache?: boolean;
  holderStats?: HolderStats;
}