import { BackButton } from "@/components/common/BackButton";
import { LeverageModal } from "@/components/multiply/LeverageModal";
import { MultiplyAnalyticsCharts } from "@/components/multiply/MultiplyAnalyticsCharts";
import { MultiplyChart } from "@/components/multiply/MultiplyChart";
import { MultiplyHero } from "@/components/multiply/MultiplyHero";
import { MultiplyStatsGrid } from "@/components/multiply/MultiplyStatsGrid";
import { MultiplyPositionPanel } from "@/components/portfolio/MultiplyPositionPanel";
import { useMultiplyStrategy } from "@/hooks/useMultiply";
import { useWalletConnection } from "@solana/react-hooks";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

export function MultiplyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connected } = useWalletConnection();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: strategy, isLoading } = useMultiplyStrategy(id);
  const chartSeed = useMemo(
    () =>
      strategy
        ? strategy.id.charCodeAt(0) * 31 + (strategy.id.charCodeAt(1) ?? 0)
        : 42,
    [strategy],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#efe0f7]/30 text-sm">
        Loading strategy…
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[#efe0f7]/50 text-sm">Strategy not found.</p>
        <button
          onClick={() => navigate("/multiply")}
          className="text-xs text-[#c698e5] hover:underline cursor-pointer"
        >
          ← Back to Multiply
        </button>
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <LeverageModal pool={strategy} onClose={() => setIsModalOpen(false)} />
      )}

      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <BackButton to="/multiply" label="Back to Multiply" />

        <MultiplyHero
          pool={strategy}
          isWalletConnected={connected}
          onOpenPosition={() => setIsModalOpen(true)}
        />

        <MultiplyStatsGrid pool={strategy} />

        <div className="mt-5">
          <MultiplyPositionPanel pool={strategy} connected={connected} />
        </div>

        {/* Price chart (2/3) + How it Works sidebar (1/3) */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <MultiplyChart pool={strategy} seed={chartSeed} />
          </div>

          {/* How it Works — vertical stepper */}
          <div className="rounded-2xl border border-[#c698e5]/12 bg-[#c698e5]/[0.02] px-5 py-6 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#efe0f7]/28 mb-6">
              How Multiply Works
            </p>

            <div className="flex flex-col flex-1">
              {/* Step 1 */}
              <div className="flex gap-3.5 flex-1">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-[#c698e5]/35 bg-[#c698e5]/12 text-[9px] font-bold text-[#c698e5] leading-none">
                    1
                  </div>
                  <div className="w-px flex-1 bg-gradient-to-b from-[#c698e5]/20 to-transparent mt-2" />
                </div>
                <div className="pb-6 pt-0.5">
                  <p className="text-sm font-semibold text-[#efe0f7]/70 mb-1 leading-snug">
                    Deposit collateral
                  </p>
                  <p className="text-xs text-[#efe0f7]/35 leading-relaxed">
                    Supply {strategy.symbol} as collateral into the pool.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5 flex-1">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-[#c698e5]/35 bg-[#c698e5]/12 text-[9px] font-bold text-[#c698e5] leading-none">
                    2
                  </div>
                  <div className="w-px flex-1 bg-gradient-to-b from-[#c698e5]/20 to-transparent mt-2" />
                </div>
                <div className="pb-6 pt-0.5">
                  <p className="text-sm font-semibold text-[#efe0f7]/70 mb-1 leading-snug">
                    Borrow {strategy.meta.debtSymbol}
                  </p>
                  <p className="text-xs text-[#efe0f7]/35 leading-relaxed">
                    Protocol borrows {strategy.meta.debtSymbol} against your
                    collateral and swaps back to {strategy.symbol}.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-[#c698e5]/35 bg-[#c698e5]/12 text-[9px] font-bold text-[#c698e5] leading-none">
                  3
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-[#efe0f7]/70 mb-1 leading-snug">
                    Compounded exposure
                  </p>
                  <p className="text-xs text-[#efe0f7]/35 leading-relaxed">
                    Loop repeats to your target multiplier. Net APY = staking
                    yield − borrow cost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics: Available Liquidity + Net APY over time */}
        <MultiplyAnalyticsCharts pool={strategy} seed={chartSeed} />

        {!connected && (
          <p className="mt-6 text-center text-xs text-[#efe0f7]/30">
            Connect your wallet to open a leveraged position.
          </p>
        )}
      </div>
    </>
  );
}
