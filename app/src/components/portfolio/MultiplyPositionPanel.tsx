import { POOLS } from "@/lib/mocks/pools.mock";
import type { Pool } from "@/types/pool";
import { useState } from "react";
import { PnlCell } from "../common/PnlCell";
import { PositionActionButton } from "../common/PositionActionButton";
import {
  ClosePositionModal,
  type CloseMultiplyPosition,
} from "./ClosePositionModal";
import {
  ManagePositionModal,
  type ManageMultiplyPosition,
} from "./ManagePositionModal";

// ─── Mock position data keyed by pool.id ──────────────────────────────────────

type MultiplyPos = ManageMultiplyPosition & CloseMultiplyPosition;

const MOCK_MULTIPLY: Record<string, MultiplyPos> = {
  sol: {
    asset: "SOL",
    icon: POOLS.find((p) => p.id === "sol")!.icon,
    debtAsset: "USDC",
    multiplier: 2.4,
    netAPY: 3.1,
    positionSize: 3_840,
    entryPrice: 142.5,
    currentPrice: 158.2,
    liqPrice: 112.3,
    pnl: 432.8,
    pnlPct: 11.27,
  },
  jitosol: {
    asset: "jitoSOL",
    icon: POOLS.find((p) => p.id === "jitosol")!.icon,
    debtAsset: "SOL",
    multiplier: 3.8,
    netAPY: 12.4,
    positionSize: 2_210,
    entryPrice: 176.4,
    currentPrice: 182.1,
    liqPrice: 138.6,
    pnl: 122.6,
    pnlPct: 5.55,
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

type ModalState =
  | { type: "manage"; pos: MultiplyPos }
  | { type: "close"; pos: MultiplyPos }
  | null;

interface MultiplyPositionPanelProps {
  pool: Pool;
  connected: boolean;
}

export function MultiplyPositionPanel({
  pool,
  connected,
}: MultiplyPositionPanelProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const pos = MOCK_MULTIPLY[pool.id];

  if (!connected || !pos) return null;

  // const isPnlPositive = pos.pnl >= 0;

  return (
    <>
      <div className="rounded-2xl border border-[#c698e5]/12 bg-[#c698e5]/[0.02] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#c698e5]/10">
          <div className="h-1.5 w-1.5 rounded-full bg-[#c698e5]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#efe0f7]/45">
            My Positions
          </span>
        </div>

        {/* Position row */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 px-4 py-3.5">
          {/* Asset */}
          <div className="flex items-center gap-2 min-w-[90px]">
            <img
              src={pos.icon}
              alt={pos.asset}
              className="h-6 w-6 rounded-full"
            />
            <div>
              <p className="text-sm font-semibold text-[#efe0f7]">
                {pos.asset}
              </p>
              <p className="text-[10px] text-[#efe0f7]/35">Multiply</p>
            </div>
          </div>

          {/* Multiplier */}
          <div className="flex flex-col min-w-[55px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">
              Multiplier
            </span>
            <span className="text-sm font-bold tabular-nums text-[#c698e5]">
              {pos.multiplier.toFixed(1)}×
            </span>
          </div>

          {/* Net APY */}
          <div className="flex flex-col min-w-[60px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">
              Net APY
            </span>
            <span className="text-sm font-semibold tabular-nums text-[#34d399]">
              {pos.netAPY.toFixed(1)}%
            </span>
          </div>

          {/* Position size */}
          <div className="flex flex-col min-w-[85px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">
              Position
            </span>
            <span className="text-sm font-semibold tabular-nums text-[#efe0f7]">
              ${pos.positionSize.toLocaleString()}
            </span>
          </div>

          {/* Entry price */}
          <div className="flex flex-col min-w-[75px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Entry</span>
            <span className="text-sm tabular-nums text-[#efe0f7]/55">
              ${pos.entryPrice.toFixed(2)}
            </span>
          </div>

          {/* Current price */}
          <div className="flex flex-col min-w-[75px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">
              Current
            </span>
            <span className="text-sm tabular-nums text-[#efe0f7]">
              ${pos.currentPrice.toFixed(2)}
            </span>
          </div>

          {/* PnL */}
          <div className="flex flex-col min-w-[90px]">
            <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">P&L</span>
            <PnlCell pnl={pos.pnl} pct={pos.pnlPct} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <PositionActionButton
              label="Manage"
              onClick={() => setModal({ type: "manage", pos })}
            />
            <PositionActionButton
              label="Close"
              onClick={() => setModal({ type: "close", pos })}
            />
          </div>
        </div>
      </div>

      {modal?.type === "manage" && (
        <ManagePositionModal
          position={modal.pos}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "close" && (
        <ClosePositionModal
          position={modal.pos}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
