import { POOLS } from "@/lib/mocks/pools.mock";
import { cn } from "@/lib/utils";
import type { Pool } from "@/types/pool";
import { useState } from "react";
import { HealthBadge, HFBadge } from "../common/Badge";
import { PositionActionButton } from "../common/PositionActionButton";
import { type AddCollateralPosition } from "./AddCollateralModal";
import { RepayModal, type RepayPosition } from "./RepayModal";
import { type SupplyMorePosition } from "./SupplyMoreModal";
import { WithdrawModal, type WithdrawPosition } from "./WithdrawModal";

// ─── Mock position data keyed by pool.id ──────────────────────────────────────

type LendPos = WithdrawPosition &
  SupplyMorePosition & { earned: number; health: number };
type BorrowPos = RepayPosition & AddCollateralPosition & { id: string };

const MOCK_LEND: Record<string, LendPos> = {
  usdc: {
    asset: "USDC",
    icon: POOLS.find((p) => p.id === "usdc")!.icon,
    supplied: 3_250,
    apy: 5.85,
    earned: 142.3,
    health: 88,
    collateralEnabled: true,
  },
  sol: {
    asset: "SOL",
    icon: POOLS.find((p) => p.id === "sol")!.icon,
    supplied: 12.5,
    apy: 5.42,
    earned: 0.52,
    health: 94,
    collateralEnabled: true,
  },
  usdt: {
    asset: "USDT",
    icon: POOLS.find((p) => p.id === "usdt")!.icon,
    supplied: 1_800,
    apy: 4.91,
    earned: 67.8,
    health: 91,
    collateralEnabled: false,
  },
};

const MOCK_BORROW: Record<string, BorrowPos> = {
  usdc: {
    id: "usdc-borrow",
    collateralAsset: "SOL",
    collateralIcon: POOLS.find((p) => p.id === "sol")!.icon,
    borrowedAsset: "USDC",
    borrowedIcon: POOLS.find((p) => p.id === "usdc")!.icon,
    debtAmount: 1_200,
    borrowAPY: 8.17,
    ltv: 42.3,
    liqPrice: 98.4,
    healthFactor: 2.18,
  },
  sol: {
    id: "sol-borrow",
    collateralAsset: "wBTC",
    collateralIcon: POOLS.find((p) => p.id === "wbtc")!.icon,
    borrowedAsset: "SOL",
    borrowedIcon: POOLS.find((p) => p.id === "sol")!.icon,
    debtAmount: 4.2,
    borrowAPY: 8.14,
    ltv: 29.7,
    liqPrice: 112.6,
    healthFactor: 3.04,
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-4 border-b border-[#c698e5]/8 bg-[#c698e5]/[0.015]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#efe0f7]/30">
        {label}
      </span>
    </div>
  );
}

function LendRow({
  pos,
  onWithdraw,
}: {
  pos: LendPos;
  onWithdraw: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-2 px-4 py-3.5 border-b border-[#c698e5]/8 last:border-none">
      {/* Asset */}
      <div className="flex items-center gap-2 min-w-[90px]">
        <img src={pos.icon} alt={pos.asset} className="h-6 w-6 rounded-full" />
        <p className="text-sm font-semibold text-[#efe0f7]">{pos.asset}</p>
      </div>

      {/* Supplied */}
      <div className="flex flex-col min-w-[80px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Supplied</span>
        <span className="text-sm font-semibold tabular-nums text-[#efe0f7]">
          ${pos.supplied.toLocaleString()}
        </span>
      </div>

      {/* APY */}
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">APY</span>
        <span className="text-sm font-semibold tabular-nums text-[#34d399]">
          {pos.apy.toFixed(2)}%
        </span>
      </div>

      {/* Earned */}
      <div className="flex flex-col min-w-[70px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Earned</span>
        <span className="text-sm tabular-nums text-[#34d399]">
          +${pos.earned < 1 ? pos.earned.toFixed(3) : pos.earned.toFixed(2)}
        </span>
      </div>

      {/* Health */}
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Health</span>
        <HealthBadge value={pos.health} />
      </div>

      {/* Collateral */}
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Collateral</span>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium w-fit",
            pos.collateralEnabled
              ? "bg-[#34d399]/10 text-[#34d399]"
              : "bg-[#efe0f7]/8 text-[#efe0f7]/35",
          )}
        >
          {pos.collateralEnabled ? "On" : "Off"}
        </span>
      </div>

      {/* Actions — only Withdraw, no Supply more */}
      <div className="flex items-center gap-2 ml-auto">
        <PositionActionButton label="Withdraw" onClick={onWithdraw} />
      </div>
    </div>
  );
}

function BorrowRow({ pos, onRepay }: { pos: BorrowPos; onRepay: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-2 px-4 py-3.5 border-b border-[#c698e5]/8 last:border-none">
      {/* Borrowed asset (primary) */}
      <div className="flex items-center gap-2 min-w-[90px]">
        <img
          src={pos.borrowedIcon}
          alt={pos.borrowedAsset}
          className="h-6 w-6 rounded-full"
        />
        <p className="text-sm font-semibold text-[#efe0f7]">
          {pos.borrowedAsset}
        </p>
      </div>

      {/* Debt */}
      <div className="flex flex-col min-w-[80px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Debt</span>
        <span className="text-sm font-semibold tabular-nums text-[#d45677]">
          −{pos.debtAmount.toLocaleString()}
        </span>
      </div>

      {/* Borrow APY */}
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Borrow APY</span>
        <span className="text-sm font-semibold tabular-nums text-[#d45677]">
          {pos.borrowAPY.toFixed(2)}%
        </span>
      </div>

      {/* LTV */}
      <div className="flex flex-col min-w-[50px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">LTV</span>
        <span className="text-sm tabular-nums text-[#efe0f7]/70">
          {pos.ltv.toFixed(1)}%
        </span>
      </div>

      {/* Liq. Price */}
      <div className="flex flex-col min-w-[70px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">Liq. Price</span>
        <span className="text-sm tabular-nums text-[#efe0f7]/70">
          ${pos.liqPrice.toFixed(1)}
        </span>
      </div>

      {/* Health Factor */}
      <div className="flex flex-col min-w-[60px]">
        <span className="text-[10px] text-[#efe0f7]/35 mb-0.5">HF</span>
        <HFBadge value={pos.healthFactor} />
      </div>

      {/* Actions — only Repay, no Add collateral */}
      <div className="flex items-center gap-2 ml-auto">
        <PositionActionButton label="Repay" onClick={onRepay} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ModalState =
  | { type: "withdraw"; pos: LendPos }
  | { type: "repay"; pos: BorrowPos }
  | null;

interface PoolPositionPanelProps {
  pool: Pool;
  connected: boolean;
}

export function PoolPositionPanel({ pool, connected }: PoolPositionPanelProps) {
  const [modal, setModal] = useState<ModalState>(null);

  const lend = MOCK_LEND[pool.id];
  const borrow = MOCK_BORROW[pool.id];

  if (!connected || (!lend && !borrow)) return null;

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

        {lend && (
          <>
            <SectionLabel label="Lend" />
            <LendRow
              pos={lend}
              onWithdraw={() => setModal({ type: "withdraw", pos: lend })}
            />
          </>
        )}

        {borrow && (
          <>
            <SectionLabel label="Borrow" />
            <BorrowRow
              pos={borrow}
              onRepay={() => setModal({ type: "repay", pos: borrow })}
            />
          </>
        )}
      </div>

      {modal?.type === "withdraw" && (
        <WithdrawModal position={modal.pos} onClose={() => setModal(null)} />
      )}
      {modal?.type === "repay" && (
        <RepayModal position={modal.pos} onClose={() => setModal(null)} />
      )}
    </>
  );
}
