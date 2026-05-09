import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export interface CloseMultiplyPosition {
  asset: string;
  icon: string;
  debtAsset: string;
  multiplier: number;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}

interface ClosePositionModalProps {
  position: CloseMultiplyPosition;
  onClose: () => void;
  /** future: pass onClosePosition() => Promise<void> */
  onClosePosition?: () => Promise<void>;
}

export function ClosePositionModal({
  position,
  onClose,
  onClosePosition,
}: ClosePositionModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const isPnlPositive = position.pnl >= 0;

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit() {
    if (!confirmed) return;
    if (onClosePosition) await onClosePosition();
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
            <img
              src={position.icon}
              alt={position.asset}
              className="h-9 w-9 rounded-full ring-1 ring-[#c698e5]/20"
            />
            <div>
              <p className="text-sm font-semibold text-[#efe0f7]">
                Close Position
              </p>
              <p className="text-[11px] text-[#efe0f7]/35">
                {position.asset} ·{" "}
                <span className="text-[#c698e5]">
                  {position.multiplier.toFixed(1)}×
                </span>{" "}
                · debt {position.debtAsset}
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
          {/* PnL card */}
          <div
            className={cn(
              "rounded-xl border px-4 py-4 flex flex-col items-center gap-1",
              isPnlPositive
                ? "border-[#34d399]/20 bg-[#34d399]/5"
                : "border-[#d45677]/20 bg-[#d45677]/5",
            )}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#efe0f7]/40">
              Realised P&L
            </span>
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                isPnlPositive ? "text-[#34d399]" : "text-[#d45677]",
              )}
            >
              {isPnlPositive ? "+" : ""}${Math.abs(position.pnl).toFixed(2)}
            </span>
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                isPnlPositive ? "text-[#34d399]/70" : "text-[#d45677]/70",
              )}
            >
              {isPnlPositive ? "+" : ""}
              {position.pnlPct.toFixed(2)}%
            </span>
          </div>

          {/* Position summary */}
          <div className="rounded-xl border border-[#c698e5]/10 divide-y divide-[#c698e5]/8">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs text-[#efe0f7]/40">Position size</span>
              <span className="text-xs font-semibold tabular-nums text-[#efe0f7]/70">
                ${position.positionSize.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs text-[#efe0f7]/40">Entry price</span>
              <span className="text-xs font-semibold tabular-nums text-[#efe0f7]/70">
                ${position.entryPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs text-[#efe0f7]/40">Current price</span>
              <span className="text-xs font-semibold tabular-nums text-[#efe0f7]/80">
                ${position.currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs text-[#efe0f7]/40">Debt to repay</span>
              <span className="text-xs font-semibold tabular-nums text-[#efe0f7]/70">
                {position.debtAsset}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-[#f0a854]/15 bg-[#f0a854]/5 px-3.5 py-2.5 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#f0a854] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#f0a854]/80 leading-relaxed">
              Closing this position will repay all debt and return the remaining
              collateral to your wallet.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              onClick={() => setConfirmed(!confirmed)}
              className={cn(
                "h-4 w-4 rounded flex-shrink-0 border transition-all cursor-pointer flex items-center justify-center",
                confirmed
                  ? "bg-[#c698e5] border-[#c698e5]"
                  : "border-[#c698e5]/30 bg-transparent hover:border-[#c698e5]/60",
              )}
            >
              {confirmed && (
                <svg
                  className="h-2.5 w-2.5 text-[#17081f]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-[11px] text-[#efe0f7]/45 group-hover:text-[#efe0f7]/65 transition-colors">
              I understand this action is irreversible
            </span>
          </label>

          <button
            disabled={!confirmed}
            onClick={handleSubmit}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] cursor-pointer",
              confirmed
                ? "bg-[#d45677] text-white hover:bg-[#e0647f]"
                : "bg-[#c698e5]/12 text-[#efe0f7]/20 cursor-not-allowed",
            )}
          >
            Close Position
          </button>
        </div>
      </div>
    </div>
  );
}
