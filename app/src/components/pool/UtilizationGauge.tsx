import { formatRawTokens } from "@/lib/formatters";

interface UtilizationGaugeProps {
  utilization: number;
  totalSupplied: number;
  totalBorrowed: number;
}

export function UtilizationGauge({
  utilization,
  totalSupplied,
  totalBorrowed,
}: UtilizationGaugeProps) {
  const pct = Math.min(100, Math.max(0, utilization));
  const color = pct < 60 ? "#34d399" : pct < 80 ? "#f0a854" : "#d45677";
  const label = pct < 60 ? "Healthy" : pct < 80 ? "Elevated" : "High";
  const available = Math.max(0, totalSupplied - totalBorrowed);

  return (
    <div className="rounded-2xl border border-[#c698e5]/15 bg-[#c698e5]/[0.03] px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-[#efe0f7]">Utilization</p>
          <p className="text-[11px] text-[#efe0f7]/35 mt-0.5">
            Supply vs borrow ratio
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
          style={{
            color,
            borderColor: color + "35",
            backgroundColor: color + "12",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      </div>

      {/* Big percentage + bar */}
      <div className="flex items-end gap-4 mb-4">
        <span
          className="text-4xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {pct.toFixed(1)}%
        </span>
        <span className="text-[11px] text-[#efe0f7]/30 mb-1 leading-none">
          utilization rate
        </span>
      </div>

      {/* Segmented horizontal bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-[#c698e5]/8 mb-1">
        {/* Zone tint layers */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: "60%", backgroundColor: "rgba(52,211,153,0.10)" }}
        />
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: "60%",
            width: "20%",
            backgroundColor: "rgba(240,168,84,0.10)",
          }}
        />
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: "80%",
            width: "20%",
            backgroundColor: "rgba(212,86,119,0.10)",
          }}
        />
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              pct < 60
                ? "linear-gradient(to right, rgba(52,211,153,0.5), #34d399)"
                : pct < 80
                ? "linear-gradient(to right, rgba(52,211,153,0.5), #f0a854)"
                : "linear-gradient(to right, rgba(52,211,153,0.5), #f0a854, #d45677)",
          }}
        />
        {/* Zone dividers */}
        <div
          className="absolute inset-y-0 w-px bg-[#1a0d24]/60"
          style={{ left: "60%" }}
        />
        <div
          className="absolute inset-y-0 w-px bg-[#1a0d24]/60"
          style={{ left: "80%" }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex text-[9px] text-[#efe0f7]/25 font-medium mb-5">
        <span style={{ width: "60%" }}>0 – 60%</span>
        <span style={{ width: "20%" }} className="text-center">
          60 – 80%
        </span>
        <span style={{ width: "20%" }} className="text-right">
          80 – 100%
        </span>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 gap-2 border-t border-[#c698e5]/10 pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#efe0f7]/30">
            Total Supply
          </span>
          <span className="text-sm font-semibold text-[#c698e5] tabular-nums">
            {formatRawTokens(totalSupplied)}
          </span>
          <div className="h-0.5 rounded-full bg-[#c698e5]/20 mt-0.5">
            <div className="h-full w-full rounded-full bg-[#c698e5]" />
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#efe0f7]/30">
            Total Borrowed
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color }}
          >
            {formatRawTokens(totalBorrowed)}
          </span>
          <div className="h-0.5 rounded-full bg-[#c698e5]/10 mt-0.5 w-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#efe0f7]/30">
            Available
          </span>
          <span className="text-sm font-medium text-[#efe0f7]/55 tabular-nums">
            {formatRawTokens(available)}
          </span>
          <div className="h-0.5 rounded-full bg-[#efe0f7]/8 mt-0.5 w-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#efe0f7]/30 transition-all duration-700"
              style={{ width: `${100 - pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
