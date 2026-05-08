export type Category = "stablecoin" | "volatile" | "lsd";

export interface Pool {
  id: string;
  address: string;
  name: string;
  symbol: string;
  icon: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupplied: number;
  totalBorrowed: number;
  utilization: number;
  category: Category;
  availableLiquidity: number;
}

export interface MultiplyMeta {
  maxMultiplier: number;
  maxNetAPY: number;
  debtSymbol: string;
  debtIcon: string;
}
