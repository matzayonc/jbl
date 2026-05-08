import { TD, TH } from "@/components/common/tableStyles";
import { useBorrowPositions } from "@/hooks/usePortfolio";
import type { BorrowPosition } from "@/types/portfolio";
import { useState } from "react";
import { HFBadge } from "../common/Badge";
import { EmptyTableState } from "../common/EmptyTableState";
import { PositionActionButton } from "../common/PositionActionButton";
import { AddCollateralModal } from "./AddCollateralModal";
import { RepayModal } from "./RepayModal";

type ModalState =
  | { type: "repay"; position: BorrowPosition }
  | { type: "collateral"; position: BorrowPosition }
  | null;

export function BorrowTable() {
  const { data: positions = [], isLoading } = useBorrowPositions();
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
                <th className={TH}>Borrowed</th>
                <th className={TH + " text-right"}>Debt</th>
                <th className={TH + " text-right"}>Borrow APY</th>
                <th className={TH + " text-right"}>LTV</th>
                <th className={TH + " text-right"}>Liq. Price</th>
                <th className={TH + " text-center"}>Health Factor</th>
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
                  <td className={TD + " w-[200px]"}>
                    <div className="flex items-center gap-2">
                      <img
                        src={pos.borrowedIcon}
                        alt={pos.borrowedAsset}
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="font-semibold text-[#efe0f7]">
                        {pos.borrowedAsset}
                      </span>
                    </div>
                  </td>
                  <td
                    className={
                      TD + " text-right tabular-nums font-medium text-[#d45677]"
                    }
                  >
                    −${pos.debtAmount.toLocaleString()}
                  </td>
                  <td
                    className={
                      TD +
                      " text-right text-[#d45677] font-semibold tabular-nums"
                    }
                  >
                    {pos.borrowAPY.toFixed(2)}%
                  </td>
                  <td className={TD + " text-right tabular-nums"}>
                    {pos.ltv.toFixed(1)}%
                  </td>
                  <td className={TD + " text-right tabular-nums"}>
                    ${pos.liqPrice.toFixed(1)}
                  </td>
                  <td className={TD + " text-center"}>
                    <HFBadge value={pos.healthFactor} />
                  </td>
                  <td className={TD + " text-right"}>
                    <div className="flex items-center justify-end gap-2">
                      <PositionActionButton
                        label="Repay"
                        onClick={() =>
                          setModal({ type: "repay", position: pos })
                        }
                      />
                      <PositionActionButton
                        label="Add collateral"
                        onClick={() =>
                          setModal({ type: "collateral", position: pos })
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

      {modal?.type === "repay" && (
        <RepayModal position={modal.position} onClose={() => setModal(null)} />
      )}
      {modal?.type === "collateral" && (
        <AddCollateralModal
          position={modal.position}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
