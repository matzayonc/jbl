import { MULTIPLY_META } from "@/lib/mocks/multiply.mock";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types/pool";
import { Info, Shield, TrendingUp, Wallet, X, Zap } from "lucide-react";
import { useState } from "react";

const MOCK_WALLET_BALANCE = 1_240.5;

interface LeverageModalProps {
  pool: Pool;
  onClose: () => void;
}

export function LeverageModal({ pool, onClose }: LeverageModalProps) {
  const meta = MULTIPLY_META[pool.id];
  const [amount, setAmount] = useState("");
  const [multiplier, setMultiplier] = useState(1.5);

  const positionSize = parseFloat(amount || "0") * multiplier;
  const borrowAmount = parseFloat(amount || "0") * (multiplier - 1);
  const netApy =
    multiplier <= 1
      ? pool.supplyAPY
      : pool.supplyAPY +
        ((meta.maxNetAPY - pool.supplyAPY) * (multiplier - 1)) /
          (meta.maxMultiplier - 1);

  const liquidationRisk =
    multiplier < 2 ? "Low" : multiplier < 3.5 ? "Moderate" : "High";
  const riskColor =
    liquidationRisk === "Low"
      ? "text-emerald-400"
      : liquidationRisk === "Moderate"
      ? "text-[#f0a854]"
      : "text-[#d45677]";

  const sliderPct = ((multiplier - 1) / (meta.maxMultiplier - 1)) * 100;

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#c698e5]/15 bg-[#1a0d24] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#c698e5]/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={pool.icon}
                alt={pool.symbol}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full ring-1 ring-[#c698e5]/20"
              />
              <img
                src={meta.debtIcon}
                alt={meta.debtSymbol}
                width={18}
                height={18}
                className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full ring-1 ring-[#1a0d24]"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#efe0f7]">
                Multiply {pool.symbol}
              </p>
              <p className="text-[11px] text-[#efe0f7]/35">
                Borrow {meta.debtSymbol} · up to {meta.maxMultiplier}×
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#efe0f7]/30 hover:bg-[#c698e5]/10 hover:text-[#efe0f7] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 flex flex-col gap-5">
          {/* Amount input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="px-1 flex items-center gap-1.5 text-[11px] text-[#efe0f7]/40">
                Amount
              </span>
              <button
                onClick={() => setAmount(MOCK_WALLET_BALANCE.toFixed(2))}
                className="flex items-center gap-1 text-[11px] text-[#efe0f7]/35 hover:text-[#c698e5] transition-colors cursor-pointer"
              >
                <Wallet className="h-3 w-3" />
                <span className="tabular-nums text-[#efe0f7]/50">
                  {MOCK_WALLET_BALANCE.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {meta.debtSymbol}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#c698e5]/15 bg-[#c698e5]/5 px-3.5 py-3 transition-colors focus-within:border-[#c698e5]/40">
              <img
                src={meta.debtIcon}
                alt={meta.debtSymbol}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full flex-shrink-0"
              />
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-[#efe0f7] placeholder-[#efe0f7]/20 outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] font-semibold text-[#efe0f7]/40 flex-shrink-0">
                {meta.debtSymbol}
              </span>
            </div>
          </div>

          {/* Multiplier slider */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-[#efe0f7]/40">Multiplier</span>
              <span className="text-sm font-bold text-[#c698e5] tabular-nums">
                {multiplier.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={meta.maxMultiplier}
              step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer
                [&::-webkit-slider-runnable-track]:rounded-full
                [&::-webkit-slider-runnable-track]:h-1.5
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#c698e5]
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(198,152,229,0.5)]
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[#1a0d24]
                [&::-webkit-slider-thumb]:-mt-[3px]"
              style={{
                background: `linear-gradient(to right, #c698e5 0%, #c698e5 ${sliderPct}%, rgba(198,152,229,0.15) ${sliderPct}%, rgba(198,152,229,0.15) 100%)`,
              }}
            />
            <div className="flex justify-between px-0.5">
              {Array.from(
                { length: Math.floor(meta.maxMultiplier) },
                (_, i) => i + 1,
              ).map((v) => (
                <button
                  key={v}
                  onClick={() => setMultiplier(v)}
                  className={cn(
                    "text-[10px] font-medium transition-colors cursor-pointer",
                    Math.round(multiplier) === v
                      ? "text-[#c698e5]"
                      : "text-[#efe0f7]/25 hover:text-[#efe0f7]/60",
                  )}
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>

          {/* Position summary */}
          <div className="rounded-xl border border-[#c698e5]/10 divide-y divide-[#c698e5]/8">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <TrendingUp className="h-3 w-3" />
                Position size
              </span>
              <span className="text-xs font-semibold text-[#efe0f7]/80 tabular-nums">
                {positionSize > 0
                  ? `${positionSize.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })} ${meta.debtSymbol}`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Info className="h-3 w-3" />
                Borrow amount
              </span>
              <div className="flex items-center gap-1.5">
                <img
                  src={meta.debtIcon}
                  alt={meta.debtSymbol}
                  className="h-3.5 w-3.5 rounded-full"
                />
                <span className="text-xs font-semibold text-[#efe0f7]/80 tabular-nums">
                  {borrowAmount > 0
                    ? `${borrowAmount.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })} ${meta.debtSymbol}`
                    : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Zap className="h-3 w-3" />
                Net APY
              </span>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {netApy.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Shield className="h-3 w-3" />
                Liquidation risk
              </span>
              <span className={cn("text-xs font-semibold", riskColor)}>
                {liquidationRisk}
              </span>
            </div>
          </div>

          <button
            disabled={!amount || parseFloat(amount) <= 0}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
              amount && parseFloat(amount) > 0
                ? "bg-[#c698e5] text-[#17081f] hover:bg-[#d4aeee] cursor-pointer shadow-[0_0_24px_rgba(198,152,229,0.30)]"
                : "bg-[#c698e5]/10 text-[#efe0f7]/20 cursor-not-allowed",
            )}
          >
            Open {multiplier.toFixed(1)}× Position
          </button>
        </div>
      </div>
    </div>
  );
}
