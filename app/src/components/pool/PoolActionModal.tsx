import { type Pool } from "@/data/pools";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Wallet, X } from "lucide-react";
import { useState } from "react";

export type ModalMode = "deposit" | "borrow";

interface PoolActionModalProps {
  mode: ModalMode;
  pool: Pool;
  onClose: () => void;
}

const MOCK_WALLET_BALANCE = 1_240.5;
const MOCK_MAX_BORROW = 892.3;
const MOCK_HEALTH_FACTOR = 2.14;

export function PoolActionModal({ mode, pool, onClose }: PoolActionModalProps) {
  const [amount, setAmount] = useState("");

  const isDeposit = mode === "deposit";
  const limit = isDeposit ? MOCK_WALLET_BALANCE : MOCK_MAX_BORROW;

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#c698e5]/15 bg-[#1a0d24] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <p className="text-base font-semibold text-[#efe0f7]">
            {isDeposit ? "Deposit" : "Borrow"}
          </p>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#efe0f7]/30 hover:bg-[#c698e5]/10 hover:text-[#efe0f7] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-[11px] text-[#efe0f7]/40 flex-shrink-0">
                Amount
              </span>
              <button
                onClick={() => setAmount(limit.toFixed(2))}
                className="flex items-center gap-1 text-[11px] text-[#efe0f7]/35 hover:text-[#c698e5] transition-colors cursor-pointer min-w-0"
              >
                <Wallet className="h-3 w-3 flex-shrink-0" />
                <span className="flex-shrink-0">
                  {isDeposit ? "Balance" : "Max"}:
                </span>
                <span className="tabular-nums text-[#efe0f7]/55 truncate">
                  {limit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {pool.symbol}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#c698e5]/15 bg-[#c698e5]/5 px-3.5 py-3 transition-colors focus-within:border-[#c698e5]/40">
              <img
                src={pool.icon}
                alt={pool.symbol}
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
                {pool.symbol}
              </span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => setAmount(((limit * p) / 100).toFixed(2))}
                className="flex-1 rounded-lg border border-[#c698e5]/15 py-1.5 text-[11px] font-medium text-[#efe0f7]/35 hover:border-[#c698e5]/35 hover:text-[#c698e5] transition-all cursor-pointer"
              >
                {p}%
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#c698e5]/10 divide-y divide-[#c698e5]/8">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Info className="h-3 w-3" />
                {isDeposit ? "Supply APY" : "Borrow APY"}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {isDeposit
                  ? `${pool.supplyAPY.toFixed(2)}%`
                  : `${pool.borrowAPY.toFixed(2)}%`}
              </span>
            </div>
            {!isDeposit && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                  <AlertTriangle className="h-3 w-3" />
                  Health factor
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    MOCK_HEALTH_FACTOR > 2
                      ? "text-emerald-400"
                      : MOCK_HEALTH_FACTOR > 1.2
                      ? "text-[#f0a854]"
                      : "text-[#d45677]",
                  )}
                >
                  {MOCK_HEALTH_FACTOR.toFixed(2)}
                </span>
              </div>
            )}
            {isDeposit && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                  <Info className="h-3 w-3" />
                  Collateral enabled
                </span>
                <span className="text-xs font-semibold text-[#efe0f7]/60">
                  Yes
                </span>
              </div>
            )}
          </div>

          <button
            disabled={!amount || parseFloat(amount) <= 0}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer",
              amount && parseFloat(amount) > 0
                ? isDeposit
                  ? "bg-[#c698e5] text-[#17081f] hover:bg-[#d4aeee]"
                  : "bg-[#d45677] text-white hover:bg-[#e0647f]"
                : "bg-[#c698e5]/12 text-[#efe0f7]/20 cursor-not-allowed",
            )}
          >
            {isDeposit ? "Deposit" : "Borrow"} {pool.symbol}
          </button>
        </div>
      </div>
    </div>
  );
}
