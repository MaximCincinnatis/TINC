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

export interface BurnData {
  startDate: string;
  endDate: string;
  totalBurned: number;
  totalSupply: number;
  burnPercentage: number;
  emissionPerSecond: number;
  emissionSamplePeriod: number;
  isDeflationary: boolean;
  dailyBurns: DailyBurn[];
  fetchedAt: string;
  fromCache?: boolean;
}