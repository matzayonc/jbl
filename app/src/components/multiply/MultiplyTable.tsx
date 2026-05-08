import { MULTIPLY_META, formatUSD, type Pool } from "@/data/pools";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

interface MultiplyTableProps {
  pools: Pool[];
}

export function MultiplyTable({ pools }: MultiplyTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-xl border border-[#c698e5]/15">
      <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_32px] gap-4 border-b border-[#c698e5]/10 bg-[#c698e5]/5 pl-5 pr-4 py-3">
        <span className="text-[10px] font-medium uppercase tracking-widest text-[#efe0f7]/30">
          Asset
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-[#efe0f7]/30">
          Debt Token
        </span>
        <span className="text-right text-[10px] font-medium uppercase tracking-widest text-[#efe0f7]/30">
          Max Multiplier
        </span>
        <span className="text-right text-[10px] font-medium uppercase tracking-widest text-[#efe0f7]/30">
          Max Net APY
        </span>
        <span className="text-right text-[10px] font-medium uppercase tracking-widest text-[#efe0f7]/30">
          Market Size
        </span>
        <span />
      </div>

      {pools.map((pool, i) => {
        const meta = MULTIPLY_META[pool.id];
        return (
          <div
            key={pool.id}
            onClick={() => navigate(`/multiply/${pool.id}`)}
            className={cn(
              "grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_32px] gap-4 items-center pl-5 pr-4 py-5 transition-all duration-150 group cursor-pointer hover:bg-[#c698e5]/5",
              i < pools.length - 1 && "border-b border-[#c698e5]/8",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={pool.icon}
                alt={pool.symbol}
                width={36}
                height={36}
                className="h-9 w-9 flex-shrink-0 rounded-full object-contain ring-1 ring-[#c698e5]/20"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#efe0f7] group-hover:text-[#c698e5] transition-colors">
                  {pool.name}
                </p>
                <p className="text-xs text-[#efe0f7]/35">{pool.symbol}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-75">
              <img
                src={meta.debtIcon}
                alt={meta.debtSymbol}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full ring-1 ring-[#c698e5]/15"
              />
              <span className="text-xs font-medium text-[#efe0f7]/40">
                {meta.debtSymbol}
              </span>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center justify-center rounded-lg text-sm font-semibold text-[#c698e5] tabular-nums">
                {meta.maxMultiplier.toFixed(1)}×
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-emerald-400 tabular-nums">
                {meta.maxNetAPY.toFixed(2)}%
              </p>
              <p className="text-[10px] text-[#efe0f7]/25 mt-0.5">net APY</p>
            </div>

            <div className="text-right">
              <p className="text-sm text-[#efe0f7]/80">
                {formatUSD(pool.totalSupplied)}
              </p>
              <p className="text-[10px] text-[#efe0f7]/25 mt-0.5">supplied</p>
            </div>

            <ChevronRight className="h-4 w-4 text-[#efe0f7]/20 group-hover:text-[#c698e5] transition-colors" />
          </div>
        );
      })}

      {pools.length === 0 && (
        <div className="px-5 py-14 text-center text-sm text-[#efe0f7]/30">
          No strategies match your search.
        </div>
      )}
    </div>
  );
}
