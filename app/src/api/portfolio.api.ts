import {
    MOCK_BORROW_POSITIONS,
    MOCK_LEND_POSITIONS,
    MOCK_MULTIPLY_POSITIONS,
    MOCK_PORTFOLIO_SUMMARY,
} from "@/lib/mocks/portfolio.mock";
import type {
    BorrowPosition,
    LendPosition,
    MultiplyPosition,
    PortfolioSummary,
} from "@/types/portfolio";

const SIMULATED_DELAY_MS = 700;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchLendPositions(): Promise<LendPosition[]> {
  await delay(SIMULATED_DELAY_MS);
  return MOCK_LEND_POSITIONS;
}

export async function fetchBorrowPositions(): Promise<BorrowPosition[]> {
  await delay(SIMULATED_DELAY_MS);
  return MOCK_BORROW_POSITIONS;
}

export async function fetchMultiplyPositions(): Promise<MultiplyPosition[]> {
  await delay(SIMULATED_DELAY_MS);
  return MOCK_MULTIPLY_POSITIONS;
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  await delay(SIMULATED_DELAY_MS);
  return MOCK_PORTFOLIO_SUMMARY;
}
