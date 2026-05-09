import { formatUSD } from "@/lib/formatters";
import { MULTIPLY_META } from "@/lib/mocks/multiply.mock";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types/pool";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-[#c698e5]/15 bg-[#c698e5]/[0.03] px-5 py-4">
      <p className="text-[11px] text-[#efe0f7]/35 uppercase tracking-widest font-medium">
        {label}
      </p>
      <p
        className={cn(
          "text-xl font-bold tabular-nums",
          accent ?? "text-[#efe0f7]",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#efe0f7]/30">{sub}</p>}
    </div>
  );
}

interface MultiplyStatsGridProps {
  pool: Pool;
}

export function MultiplyStatsGrid({ pool }: MultiplyStatsGridProps) {
  const meta = MULTIPLY_META[pool.id];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Max Multiplier"
        value={`${meta.maxMultiplier.toFixed(1)}×`}
        sub="leverage cap"
        accent="text-[#c698e5]"
      />
      <StatCard
        label="Max Net APY"
        value={`${meta.maxNetAPY.toFixed(2)}%`}
        sub={`at ${meta.maxMultiplier}× leverage`}
        accent="text-emerald-400"
      />
      <StatCard
        label="Market Size"
        value={formatUSD(pool.totalSupplied)}
        sub="total supplied"
      />
      <StatCard
        label="Borrow APY"
        value={`${pool.borrowAPY.toFixed(2)}%`}
        sub={`${meta.debtSymbol} debt cost`}
        accent="text-[#f0a854]"
      />
    </div>
  );
}
