export interface LendPosition {
  id: string;
  asset: string;
  icon: string;
  supplied: number;
  apy: number;
  earned: number;
  health: number;
  collateralEnabled: boolean;
  /** Raw exact amount as string to avoid floating point precision issues when withdrawing max */
  rawSupplied?: string;
}

export interface BorrowPosition {
  id: string;
  collateralAsset: string;
  collateralIcon: string;
  borrowedAsset: string;
  borrowedIcon: string;
  debtAmount: number;
  borrowAPY: number;
  ltv: number;
  liqPrice: number;
  healthFactor: number;
}

export interface MultiplyPosition {
  id: string;
  asset: string;
  icon: string;
  debtAsset: string;
  multiplier: number;
  netAPY: number;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  liqPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface PortfolioSummary {
  netValue: number;
  totalSupplied: number;
  totalDebt: number;
  leveragedExposure: number;
  change30d: number;
  change30dPct: number;
  history: PortfolioHistoryPoint[];
}
