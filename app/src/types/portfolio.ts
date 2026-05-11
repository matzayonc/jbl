export interface LendPosition {
  id: string;
  asset: string;
  icon: string;
  supplied: number;
  apy: number;
  earned: number;
  health: number;
  collateralEnabled: boolean;
}

export interface BorrowPosition {
  id: string;
  poolId: string;
  collateralAsset: string;
  collateralIcon: string;
  collateralAmount: number;
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
  poolId: string;
  asset: string;
  icon: string;
  debtAsset: string;
  debtIcon: string;
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
