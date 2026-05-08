/**
 * @file PortfolioShared.tsx
 * Backward-compatible re-export shim.
 * Components should import from the canonical locations directly:
 *   - @/lib/chartStyles        → TOOLTIP_STYLE, AXIS_LINE, GRID_STYLE, LABEL_STYLE, TICK_STYLE
 *   - @/components/ui/Badge    → HealthBadge, HFBadge
 *   - @/components/ui/PnlCell  → PnlCell
 *   - @/components/ui/StatCard → StatCard
 *   - @/components/ui/ActionBtn → ActionBtn
 *   - @/components/ui/tableStyles → TH, TD
 */
export { HealthBadge, HFBadge } from "@/components/common/Badge";
export { PnlCell } from "@/components/common/PnlCell";
export { StatCard } from "@/components/common/StatCard";
export { TD, TH } from "@/components/common/tableStyles";
export {
  AXIS_LINE,
  GRID_STYLE,
  LABEL_STYLE,
  TICK_STYLE,
  TOOLTIP_STYLE,
} from "@/lib/chartStyles";
