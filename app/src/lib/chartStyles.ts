/** Shared chart colour palette */
export const CHART_COLORS = {
  purple: "#c698e5",
  green: "#34d399",
  red: "#d45677",
  orange: "#f0a854",
  bg: "#1a0d24",
  text: "#efe0f7",
} as const;

export const TOOLTIP_STYLE = {
  background: "#1a0d24",
  border: "1px solid rgba(198,152,229,0.2)",
  borderRadius: "10px",
  fontSize: "11px",
  color: "#efe0f7",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
} as const;

export const LABEL_STYLE = {
  color: "rgba(239,224,247,0.45)",
  marginBottom: 4,
} as const;

export const TICK_STYLE = {
  fill: "rgba(239,224,247,0.28)",
  fontSize: 10,
} as const;

export const AXIS_LINE = {
  stroke: "rgba(198,152,229,0.12)",
} as const;

export const GRID_STYLE = {
  strokeDasharray: "3 3" as const,
  stroke: "rgba(198,152,229,0.07)",
} as const;
