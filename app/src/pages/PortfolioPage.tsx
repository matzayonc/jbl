import { StatCard } from "@/components/common/StatCard";
import { BorrowTable } from "@/components/portfolio/BorrowTable";
import { LendTable } from "@/components/portfolio/LendTable";
import { MultiplyPositionsTable } from "@/components/portfolio/MultiplyPositionsTable";
import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { usePortfolioSummary } from "@/hooks/usePortfolio";
import { useWalletConnection } from "@solana/react-hooks";
import { Wallet } from "lucide-react";
import { useState } from "react";

const TABS = ["Lend", "Borrow", "Multiply"] as const;
type Tab = (typeof TABS)[number];

export function PortfolioPage() {
  const { connected } = useWalletConnection();
  const [activeTab, setActiveTab] = useState<Tab>("Lend");
  const { data: summary } = usePortfolioSummary(connected);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <Wallet className="h-5 w-5 text-[#c698e5]" />
          <h1 className="text-3xl font-semibold tracking-tight text-[#efe0f7]">
            Portfolio
          </h1>
        </div>
        <p className="text-sm text-[#efe0f7]/50 max-w-md">
          Track your active positions, earnings and borrowing health across all
          JBL strategies.
        </p>
      </div>

      {/* ── Wallet gate ── */}
      {!connected ? (
        <div className="flex flex-col items-center justify-center py-28 gap-6">
          <div className="rounded-full border border-[#c698e5]/20 bg-[#c698e5]/[0.06] p-5">
            <Wallet className="h-10 w-10 text-[#c698e5]/60" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#efe0f7]/80 mb-1">
              Connect your wallet
            </p>
            <p className="text-sm text-[#efe0f7]/35 max-w-xs">
              Connect a wallet to view your active positions and portfolio
              performance.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Net Portfolio Value"
              value={summary ? `$${summary.netValue.toLocaleString()}` : "—"}
              sub={
                summary
                  ? `${
                      summary.change30d >= 0 ? "+" : ""
                    }$${summary.change30d.toFixed(
                      0,
                    )} (${summary.change30dPct.toFixed(2)}%) 30d`
                  : undefined
              }
              positive={summary ? summary.change30d >= 0 : undefined}
            />
            <StatCard
              label="Total Supplied"
              value={
                summary ? `$${summary.totalSupplied.toLocaleString()}` : "—"
              }
              sub="Across all lend positions"
            />
            <StatCard
              label="Total Debt"
              value={summary ? `−$${summary.totalDebt.toLocaleString()}` : "—"}
              sub="Active borrows"
              positive={false}
            />
            <StatCard
              label="Leveraged Exposure"
              value={
                summary ? `$${summary.leveragedExposure.toLocaleString()}` : "—"
              }
              sub="Multiply positions"
            />
          </div>

          {/* ── Net Value Chart ── */}
          {summary && (summary.totalSupplied > 0 || summary.totalDebt > 0) && (
            <PortfolioChart
              history={summary.history}
              changePct30d={summary.change30dPct}
            />
          )}

          {/* ── Positions ── */}
          <div className="rounded-2xl border border-[#c698e5]/12 bg-[#c698e5]/[0.02] overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-[#c698e5]/10 px-4 pt-3 pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative cursor-pointer pb-3 px-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-[#c698e5]"
                      : "text-[#efe0f7]/40 hover:text-[#efe0f7]/70"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#c698e5]" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[180px]">
              {activeTab === "Lend" && <LendTable />}
              {activeTab === "Borrow" && <BorrowTable />}
              {activeTab === "Multiply" && <MultiplyPositionsTable />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
