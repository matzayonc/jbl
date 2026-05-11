import type {
  PortfolioHistoryPoint
} from "@/types/portfolio";

// ─── Portfolio History ────────────────────────────────────────────────────────

const PORTFOLIO_START = 10_820;

export function generatePortfolioHistory(
  days = 90,
  targetValue?: number,
): PortfolioHistoryPoint[] {
  const now = new Date();
  // If a real net value is provided, anchor the oscillation around a value
  // that will naturally arrive near targetValue by the last point.
  const startValue = targetValue != null && targetValue > 0
    ? targetValue * 0.88  // start ~12% below current so growth is visible
    : PORTFOLIO_START;
  let val = startValue;
  return Array.from({ length: days + 1 }, (_, idx) => {
    const i = days - idx;
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const s =
      Math.sin(1.3 + i * 0.07) * 0.009 +
      Math.sin(0.9 + i * 0.21) * 0.006 +
      Math.sin(2.1 + i * 0.04) * 0.005;
    val = Math.max(val * (1 + s), startValue * 0.6);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(val),
    };
  });
}
