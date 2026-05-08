import {
    fetchBorrowPositions,
    fetchLendPositions,
    fetchMultiplyPositions,
    fetchPortfolioSummary,
} from "@/api/portfolio.api";
import { useQuery } from "@tanstack/react-query";

export const portfolioKeys = {
  summary: ["portfolio", "summary"] as const,
  lend: ["portfolio", "lend"] as const,
  borrow: ["portfolio", "borrow"] as const,
  multiply: ["portfolio", "multiply"] as const,
};

export function usePortfolioSummary(enabled = true) {
  return useQuery({
    queryKey: portfolioKeys.summary,
    queryFn: fetchPortfolioSummary,
    enabled,
  });
}

export function useLendPositions(enabled = true) {
  return useQuery({
    queryKey: portfolioKeys.lend,
    queryFn: fetchLendPositions,
    enabled,
  });
}

export function useBorrowPositions(enabled = true) {
  return useQuery({
    queryKey: portfolioKeys.borrow,
    queryFn: fetchBorrowPositions,
    enabled,
  });
}

export function useMultiplyPositions(enabled = true) {
  return useQuery({
    queryKey: portfolioKeys.multiply,
    queryFn: fetchMultiplyPositions,
    enabled,
  });
}
