import { cn } from "@/lib/utils";
import { Info, Loader2, X } from "lucide-react";
import { useState } from "react";

export interface RepayPosition {
  collateralAsset: string;
  collateralIcon: string;
  borrowedAsset: string;
  borrowedIcon: string;
  debtAmount: number;
  borrowAPY: number;
}

interface RepayModalProps {
  position: RepayPosition;
  onClose: () => void;
  onRepay?: (amount: number) => Promise<void>;
  isPending?: boolean;
}

export function RepayModal({
  position,
  onClose,
  onRepay,
  isPending,
}: RepayModalProps) {
  const [amount, setAmount] = useState("");

  const numAmount = parseFloat(amount) || 0;
  const maxRepay = position.debtAmount;
  const remaining = Math.max(maxRepay - numAmount, 0);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit() {
    if (!numAmount || numAmount <= 0) return;
    if (onRepay) await onRepay(numAmount);
    onClose();
  }

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#c698e5]/15 bg-[#1a0d24] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#c698e5]/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={position.borrowedIcon}
                alt={position.borrowedAsset}
                className="h-9 w-9 rounded-full ring-1 ring-[#c698e5]/20"
              />
              <img
                src={position.collateralIcon}
                alt={position.collateralAsset}
                className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full ring-1 ring-[#1a0d24]"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#efe0f7]">
                Repay {position.borrowedAsset}
              </p>
              <p className="text-[11px] text-[#efe0f7]/35">
                Collateral: {position.collateralAsset}
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

        <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
          {/* Debt summary */}
          <div className="rounded-xl border border-[#d45677]/20 bg-[#d45677]/5 px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-xs text-[#efe0f7]/50">Outstanding debt</span>
            <span className="text-sm font-bold tabular-nums text-[#d45677]">
              ${position.debtAmount.toLocaleString()} {position.borrowedAsset}
            </span>
          </div>

          {/* Amount input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-[#efe0f7]/40">
                Repay amount
              </span>
              <button
                onClick={() => setAmount(maxRepay.toFixed(2))}
                className="text-[11px] text-[#efe0f7]/35 hover:text-[#c698e5] transition-colors cursor-pointer"
              >
                Max:{" "}
                <span className="tabular-nums text-[#efe0f7]/55">
                  {maxRepay.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {position.borrowedAsset}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#c698e5]/15 bg-[#c698e5]/5 px-3.5 py-3 transition-colors focus-within:border-[#c698e5]/40">
              <img
                src={position.borrowedIcon}
                alt={position.borrowedAsset}
                className="h-5 w-5 rounded-full flex-shrink-0"
              />
              <input
                type="number"
                min="0"
                max={maxRepay}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-[#efe0f7] placeholder-[#efe0f7]/20 outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[11px] font-semibold text-[#efe0f7]/40 flex-shrink-0">
                {position.borrowedAsset}
              </span>
            </div>
          </div>

          {/* Percentage shortcuts */}
          <div className="flex gap-1.5">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => setAmount(((maxRepay * p) / 100).toFixed(2))}
                className="flex-1 rounded-lg border border-[#c698e5]/15 py-1.5 text-[11px] font-medium text-[#efe0f7]/35 hover:border-[#c698e5]/35 hover:text-[#c698e5] transition-all cursor-pointer"
              >
                {p}%
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-[#c698e5]/10 divide-y divide-[#c698e5]/8">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Info className="h-3 w-3" />
                Borrow APY
              </span>
              <span className="text-xs font-semibold text-[#d45677]">
                {position.borrowAPY.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-[#efe0f7]/40">
                <Info className="h-3 w-3" />
                Remaining debt
              </span>
              <span className="text-xs font-semibold tabular-nums text-[#efe0f7]/70">
                {remaining.toLocaleString("en-US", {
                  maximumFractionDigits: 6,
                })}{" "}
                {position.borrowedAsset}
              </span>
            </div>
          </div>

          <button
            disabled={
              !numAmount || numAmount <= 0 || numAmount > maxRepay || isPending
            }
            onClick={handleSubmit}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2",
              numAmount > 0 && numAmount <= maxRepay && !isPending
                ? "bg-[#d45677] text-white hover:bg-[#e0647f]"
                : "bg-[#c698e5]/12 text-[#efe0f7]/20 cursor-not-allowed",
            )}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Repay {position.borrowedAsset}
          </button>
        </div>
      </div>
    </div>
  );
}
