import { TD, TH } from "@/components/common/tableStyles";
import { useLendPositions } from "@/hooks/usePortfolio";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router";
import { HealthBadge } from "../common/Badge";
import { EmptyTableState } from "../common/EmptyTableState";

export function LendTable() {
  const { data: positions = [], isLoading } = useLendPositions();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#efe0f7]/30 text-sm">
        Loading positions…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {positions.length === 0 ? (
        <EmptyTableState />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#c698e5]/10">
              <th className={TH}>Asset</th>
              <th className={TH}>Collateral</th>
              <th className={TH + " text-right"}>Supplied</th>
              <th className={TH + " text-right"}>APY</th>
              <th className={TH + " text-right"}>Earned</th>
              <th className={TH + " text-right"}>Health</th>
              <th className={TH + " w-8"}></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <tr
                key={pos.id}
                onClick={() => navigate(`/pool/${pos.id}`)}
                className={`border-b border-[#c698e5]/6 hover:bg-[#c698e5]/[0.04] cursor-pointer transition-colors ${i === positions.length - 1 ? "border-none" : ""
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
                <td className={TD}>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={pos.collateralIcon}
                      alt={pos.collateralAsset}
                      className="h-6 w-6 rounded-full"
                    />
                    <span className="font-semibold text-[#efe0f7]">
                      {pos.collateralAsset}
                    </span>
                  </div>
                </td>
                <td className={TD + " text-right tabular-nums font-medium"}>
                  ${pos.supplied.toLocaleString()}
                </td>
                <td
                  className={
                    TD + " text-right text-[#34d399] font-semibold tabular-nums"
                  }
                >
                  {pos.apy.toFixed(2)}%
                </td>
                <td className={TD + " text-right text-[#34d399] tabular-nums whitespace-nowrap"}>
                  +${pos.earned < 1
                    ? pos.earned.toFixed(3)
                    : pos.earned.toFixed(2)}
                </td>
                <td className={TD + " text-right"}>
                  <div className="flex justify-end">
                    <HealthBadge value={pos.health} />
                  </div>
                </td>

                <td className={TD + " text-right pr-5"}>
                  <ExternalLink className="h-3.5 w-3.5 text-[#efe0f7]/25" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
