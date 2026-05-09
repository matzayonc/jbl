import type {
    BorrowPosition,
    LendPosition,
    MultiplyPosition,
    PortfolioHistoryPoint,
    PortfolioSummary,
} from "@/types/portfolio";
import { POOLS } from "./pools.mock";

// ─── Lend Positions ──────────────────────────────────────────────────────────

export const MOCK_LEND_POSITIONS: LendPosition[] = [
  {
    id: "usdc-lend",
    asset: "USDC",
    icon: POOLS.find((p) => p.id === "usdc")!.icon,
    supplied: 3_250,
    apy: 5.85,
    earned: 142.3,
    health: 88,
    collateralEnabled: true,
  },
  {
    id: "sol-lend",
    asset: "SOL",
    icon: POOLS.find((p) => p.id === "sol")!.icon,
    supplied: 12.5,
    apy: 5.42,
    earned: 0.52,
    health: 94,
    collateralEnabled: true,
  },
  {
    id: "usdt-lend",
    asset: "USDT",
    icon: POOLS.find((p) => p.id === "usdt")!.icon,
    supplied: 1_800,
    apy: 4.91,
    earned: 67.8,
    health: 91,
    collateralEnabled: false,
  },
];

// ─── Borrow Positions ─────────────────────────────────────────────────────────

export const MOCK_BORROW_POSITIONS: BorrowPosition[] = [
  {
    id: "usdc-borrow",
    collateralAsset: "SOL",
    collateralIcon: POOLS.find((p) => p.id === "sol")!.icon,
    borrowedAsset: "USDC",
    borrowedIcon: POOLS.find((p) => p.id === "usdc")!.icon,
    debtAmount: 1_200,
    borrowAPY: 8.17,
    ltv: 42.3,
    liqPrice: 98.4,
    healthFactor: 2.18,
  },
  {
    id: "sol-borrow",
    collateralAsset: "wBTC",
    collateralIcon: POOLS.find((p) => p.id === "wbtc")!.icon,
    borrowedAsset: "SOL",
    borrowedIcon: POOLS.find((p) => p.id === "sol")!.icon,
    debtAmount: 4.2,
    borrowAPY: 8.14,
    ltv: 29.7,
    liqPrice: 112.6,
    healthFactor: 3.04,
  },
];

// ─── Multiply Positions ───────────────────────────────────────────────────────

export const MOCK_MULTIPLY_POSITIONS: MultiplyPosition[] = [
  {
    id: "sol-x",
    asset: "SOL",
    icon: POOLS.find((p) => p.id === "sol")!.icon,
    debtAsset: "USDC",
    multiplier: 2.4,
    netAPY: 3.1,
    positionSize: 3_840,
    entryPrice: 142.5,
    currentPrice: 158.2,
    liqPrice: 112.3,
    pnl: 432.8,
    pnlPct: 11.27,
  },
  {
    id: "jitosol-x",
    asset: "jitoSOL",
    icon: POOLS.find((p) => p.id === "jitosol")!.icon,
    debtAsset: "SOL",
    multiplier: 3.8,
    netAPY: 12.4,
    positionSize: 2_210,
    entryPrice: 176.4,
    currentPrice: 182.1,
    liqPrice: 138.6,
    pnl: 122.6,
    pnlPct: 5.55,
  },
];

// ─── Portfolio History ────────────────────────────────────────────────────────

const PORTFOLIO_START = 10_820;

export function generatePortfolioHistory(
  days = 90,
): PortfolioHistoryPoint[] {
  const now = new Date();
  let val = PORTFOLIO_START;
  return Array.from({ length: days + 1 }, (_, idx) => {
    const i = days - idx;
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const s =
      Math.sin(1.3 + i * 0.07) * 0.009 +
      Math.sin(0.9 + i * 0.21) * 0.006 +
      Math.sin(2.1 + i * 0.04) * 0.005;
    val = Math.max(val * (1 + s), PORTFOLIO_START * 0.6);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(val),
    };
  });
}

function buildPortfolioSummary(): PortfolioSummary {
  const history = generatePortfolioHistory(90);
  const netValue = history[history.length - 1].value;
  const value30dAgo = history[history.length - 31].value;
  const change30d = netValue - value30dAgo;
  const change30dPct = (change30d / value30dAgo) * 100;

  const totalSupplied =
    MOCK_LEND_POSITIONS.reduce((s, p) => s + p.supplied, 0);
  const totalDebt =
    MOCK_BORROW_POSITIONS.reduce((s, p) => s + p.debtAmount, 0);
  const leveragedExposure =
    MOCK_MULTIPLY_POSITIONS.reduce((s, p) => s + p.positionSize, 0);

  return {
    netValue,
    totalSupplied,
    totalDebt,
    leveragedExposure,
    change30d,
    change30dPct,
    history,
  };
}

export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummary = buildPortfolioSummary();
