import { formatRawTokens } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types/pool";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { useNavigate } from "react-router";

export type SortKey =
  | "supplyAPY"
  | "borrowAPY"
  | "totalSupplied"
  | "totalBorrowed";
export type SortDir = "asc" | "desc";

interface MarketTableProps {
  pools: Pool[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortIcon({
  col,
  activeKey,
  sortDir,
}: {
  col: SortKey;
  activeKey: SortKey;
  sortDir: SortDir;
}) {
  if (activeKey !== col)
    return <ChevronsUpDown className="ml-1 inline-block h-3 w-3 opacity-30" />;
  return sortDir === "asc" ? (
    <ChevronUp className="ml-1 inline-block h-3 w-3 text-[#c698e5]" />
  ) : (
    <ChevronDown className="ml-1 inline-block h-3 w-3 text-[#c698e5]" />
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  stablecoin: "text-[#34d399] bg-[#34d399]/8 border-[#34d399]/20",
  volatile: "text-[#c698e5] bg-[#c698e5]/8 border-[#c698e5]/20",
  lsd: "text-[#f0a854] bg-[#f0a854]/8 border-[#f0a854]/20",
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "supplyAPY", label: "Supply APY" },
  { key: "borrowAPY", label: "Borrow APY" },
  { key: "totalSupplied", label: "Total Supplied" },
  { key: "totalBorrowed", label: "Total Borrowed" },
];

export function MarketTable({
  pools,
  sortKey,
  sortDir,
  onSort,
}: MarketTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-2xl border border-[#c698e5]/12">
      {/* Header row */}
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,1fr)_20px] gap-4 border-b border-[#c698e5]/10 bg-[#c698e5]/[0.03] px-5 py-3 items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#efe0f7]/30">
          Asset
        </span>
        {COLUMNS.slice(0, 4).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSort(key)}
            className="flex cursor-pointer items-center justify-end text-[10px] font-semibold uppercase tracking-wider text-[#efe0f7]/30 hover:text-[#c698e5] transition-colors whitespace-nowrap"
          >
            {label}
            <SortIcon col={key} activeKey={sortKey} sortDir={sortDir} />
          </button>
        ))}
        <span />
      </div>

      {pools.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#efe0f7]/30">
          No assets match your search.
        </div>
      ) : (
        pools.map((pool, i) => (
          <div
            key={pool.id}
            onClick={() => navigate(`/pool/${pool.id}`)}
            className={cn(
              "grid grid-cols-[minmax(0,2fr)_repeat(4,1fr)_20px] gap-4 items-center px-5 py-4 cursor-pointer group transition-colors hover:bg-[#c698e5]/[0.04]",
              i < pools.length - 1 && "border-b border-[#c698e5]/8",
            )}
          >
            {/* Asset */}
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={pool.icon}
                alt={pool.symbol}
                width={36}
                height={36}
                className="h-9 w-9 flex-shrink-0 rounded-full object-contain ring-1 ring-[#c698e5]/15"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#efe0f7] group-hover:text-[#c698e5] transition-colors">
                  {pool.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-[#efe0f7]/35">
                    {pool.symbol}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold px-1.5 py-px rounded border capitalize",
                      CATEGORY_COLORS[pool.category],
                    )}
                  >
                    {pool.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Supply APY */}
            <div className="text-right">
              <p className="text-sm mr-2 font-semibold text-[#34d399] tabular-nums">
                {pool.supplyAPY.toFixed(2)}%
              </p>
            </div>

            {/* Borrow APY */}
            <div className="text-right">
              <p className="text-sm mr-2 font-semibold text-[#d45677] tabular-nums">
                {pool.borrowAPY.toFixed(2)}%
              </p>
            </div>

            {/* Total Supplied */}
            <div className="text-right">
              <p className="text-sm mr-2  tabular-nums text-[#efe0f7]/75">
                {formatRawTokens(pool.totalSupplied)}
              </p>
            </div>

            {/* Total Borrowed */}
            <div className="text-right">
              <p className="text-sm mr-2 tabular-nums text-[#efe0f7]/75">
                {formatRawTokens(pool.totalBorrowed)}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-[#efe0f7]/20 group-hover:text-[#c698e5] transition-colors justify-self-end" />
          </div>
        ))
      )}
    </div>
  );
}
