import { EmptyTableState } from "@/components/common/EmptyTableState";
import { PnlCell } from "@/components/common/PnlCell";
import { TD, TH } from "@/components/common/tableStyles";
import { useMultiplyPositions } from "@/hooks/usePortfolio";
import type { MultiplyPosition } from "@/types/portfolio";
import { useState } from "react";
import { PositionActionButton } from "../common/PositionActionButton";
import { ClosePositionModal } from "./ClosePositionModal";
import { ManagePositionModal } from "./ManagePositionModal";

type ModalState =
  | { type: "manage"; position: MultiplyPosition }
  | { type: "close"; position: MultiplyPosition }
  | null;

export function MultiplyPositionsTable() {
  const { data: positions = [], isLoading } = useMultiplyPositions();
  const [modal, setModal] = useState<ModalState>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#efe0f7]/30 text-sm">
        Loading positions…
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        {positions.length === 0 ? (
          <EmptyTableState />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#c698e5]/10">
                <th className={TH}>Asset</th>
                <th className={TH}>Debt</th>
                <th className={TH + " text-right"}>Multiplier</th>
                <th className={TH + " text-right"}>Net APY</th>
                <th className={TH + " text-right"}>Position Size</th>
                <th className={TH + " text-right"}>Entry Price</th>
                <th className={TH + " text-right"}>Current Price</th>
                <th className={TH + " text-right"}>PnL</th>
                <th className={TH + " text-right"}></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => (
                <tr
                  key={pos.id}
                  className={`border-b border-[#c698e5]/6 hover:bg-[#c698e5]/[0.03] transition-colors ${
                    i === positions.length - 1 ? "border-none" : ""
                  }`}
                >
                  <td className={TD + " w-full"}>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={pos.icon}
                        alt={pos.asset}
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="font-semibold text-[#efe0f7]">
                        {pos.asset}
                      </span>
                    </div>
                  </td>
                  <td className={TD + " text-[#efe0f7]/50 text-xs"}>
                    {pos.debtAsset}
                  </td>
                  <td
                    className={
                      TD + " text-right tabular-nums font-bold text-[#c698e5]"
                    }
                  >
                    {pos.multiplier.toFixed(1)}×
                  </td>
                  <td
                    className={
                      TD +
                      " text-right text-[#34d399] font-semibold tabular-nums"
                    }
                  >
                    {pos.netAPY.toFixed(1)}%
                  </td>
                  <td className={TD + " text-right tabular-nums font-medium"}>
                    ${pos.positionSize.toLocaleString()}
                  </td>
                  <td
                    className={
                      TD + " text-right tabular-nums text-[#efe0f7]/55"
                    }
                  >
                    ${pos.entryPrice.toFixed(1)}
                  </td>
                  <td className={TD + " text-right tabular-nums"}>
                    ${pos.currentPrice.toFixed(1)}
                  </td>
                  <td className={TD + " text-right"}>
                    <PnlCell pnl={pos.pnl} pct={pos.pnlPct} />
                  </td>
                  <td className={TD + " text-right"}>
                    <div className="flex items-center justify-end gap-2">
                      <PositionActionButton
                        label="Manage"
                        onClick={() =>
                          setModal({ type: "manage", position: pos })
                        }
                      />
                      <PositionActionButton
                        label="Close"
                        onClick={() =>
                          setModal({ type: "close", position: pos })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === "manage" && (
        <ManagePositionModal
          position={modal.position}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "close" && (
        <ClosePositionModal
          position={modal.position}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
