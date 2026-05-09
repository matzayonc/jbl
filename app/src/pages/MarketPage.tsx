import { MarketFilters } from "@/components/market/MarketFilters";
import {
  MarketTable,
  type SortDir,
  type SortKey,
} from "@/components/market/MarketTable";
import { useLendingAccounts } from "@/hooks/program/useLendingAccounts";
import { poolDataToDisplayPool } from "@/lib/poolDisplay";
import type { Category, Pool } from "@/types/pool";
import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";

export function MarketPage() {
  const { data: lendingAccounts = [], isLoading } = useLendingAccounts();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalSupplied");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  console.log("Lending accounts:", lendingAccounts);

  const allPools = useMemo<Pool[]>(
    () => lendingAccounts.map(poolDataToDisplayPool),
    [lendingAccounts],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filteredPools = useMemo(
    () =>
      allPools
        .filter((p) => {
          const q = search.toLowerCase();
          const matchesSearch =
            p.name.toLowerCase().includes(q) ||
            p.symbol.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q);
          return matchesSearch;
        })
        .sort((a, b) => {
          const mult = sortDir === "asc" ? 1 : -1;
          return mult * ((a[sortKey] as number) - (b[sortKey] as number));
        }),
    [allPools, search, categoryFilter, sortKey, sortDir],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <BarChart3 className="h-5 w-5 text-[#c698e5]" />
          <h1 className="text-3xl font-semibold tracking-tight text-[#efe0f7]">
            Markets
          </h1>
        </div>
        <p className="text-sm text-[#efe0f7]/50 max-w-lg">
          Select an asset to supply, borrow, repay or withdraw. Rates update in
          real-time based on pool utilisation.
        </p>
      </div>

      <MarketFilters
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-[#efe0f7]/30 text-sm">
          Loading markets…
        </div>
      ) : (
        <MarketTable
          pools={filteredPools}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}
    </div>
  );
}
