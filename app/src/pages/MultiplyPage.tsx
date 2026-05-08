import { MultiplyTable } from "@/components/multiply/MultiplyTable";
import { useMultiplyStrategies } from "@/hooks/useMultiply";
import { Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";

export function MultiplyPage() {
  const { data: strategies = [], isLoading } = useMultiplyStrategies();
  const [search, setSearch] = useState("");

  const pools = useMemo(() => {
    const q = search.toLowerCase();
    return strategies
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q),
      )
      .sort((a, b) => b.meta.maxNetAPY - a.meta.maxNetAPY);
  }, [strategies, search]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Zap className="h-5 w-5 text-[#c698e5]" />
          <h1 className="text-3xl font-semibold tracking-tight text-[#efe0f7]">
            Multiply
          </h1>
        </div>
        <p className="text-sm text-[#efe0f7]/50 max-w-lg">
          Leverage your position by looping collateral. Supply an asset, borrow
          the debt token and compound exposure in one click.
        </p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#efe0f7]/30" />
          <input
            type="text"
            placeholder="Search strategies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#c698e5]/15 bg-[#c698e5]/5 py-1.5 pl-8 pr-3 text-xs text-[#efe0f7] placeholder-[#efe0f7]/25 outline-none transition-all focus:border-[#c698e5]/50 focus:bg-[#c698e5]/10 focus:ring-2 focus:ring-[#c698e5]/15"
          />
        </div>
      </div>

      <MultiplyTable pools={pools} />

      {isLoading && (
        <p className="mt-4 text-center text-xs text-[#efe0f7]/30">
          Loading strategies…
        </p>
      )}

      <p className="mt-4 text-center text-xs text-[#efe0f7]/30">
        Click any position to view details and open a leveraged trade.
      </p>
    </div>
  );
}
