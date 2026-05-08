import { BackButton } from "@/components/common/BackButton";
import {
  PoolActionModal,
  type ModalMode,
} from "@/components/pool/PoolActionModal";
import { PoolHero, PoolStatsBar } from "@/components/pool/PoolHero";
import { UtilizationGauge } from "@/components/pool/UtilizationGauge";
import { BorrowApyChart } from "@/components/pool/charts/BorrowApyChart";
import { SupplyApyChart } from "@/components/pool/charts/SupplyApyChart";
import { TotalBorrowChart } from "@/components/pool/charts/TotalBorrowChart";
import { TotalSupplyChart } from "@/components/pool/charts/TotalSupplyChart";
import { PoolPositionPanel } from "@/components/portfolio/PoolPositionPanel";
import { usePool } from "@/hooks/usePools";
import { useWalletConnection } from "@solana/react-hooks";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

export function PoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pool, isLoading } = usePool(id);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const { connected } = useWalletConnection();

  const chartSeed = useMemo(
    () => (pool ? pool.id.charCodeAt(0) + pool.id.charCodeAt(1) : 42),
    [pool],
  );

  if (isLoading || !pool) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <BackButton to="/" label="Back to markets" />
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          {isLoading ? (
            <p className="text-[#efe0f7]/30 text-sm">Loading pool…</p>
          ) : (
            <>
              <p className="text-[#efe0f7]/50 text-sm">Pool not found.</p>
              <button
                onClick={() => navigate("/")}
                className="text-xs text-[#c698e5] hover:underline"
              >
                ← Back to markets
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <PoolActionModal
          mode={modal}
          pool={pool}
          onClose={() => setModal(null)}
        />
      )}

      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <BackButton to="/" label="Back to Markets" />

        <PoolHero
          pool={pool}
          isWalletConnected={connected}
          onDeposit={() => setModal("deposit")}
          onBorrow={() => setModal("borrow")}
        />

        <PoolStatsBar pool={pool} />

        <div className="mt-5">
          <PoolPositionPanel pool={pool} connected={connected} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <TotalSupplyChart
            totalSupplied={pool.totalSupplied}
            seed={chartSeed}
          />
          <SupplyApyChart supplyApy={pool.supplyAPY} seed={chartSeed} />
        </div>

        <div className="mt-6">
          <UtilizationGauge
            utilization={pool.utilization}
            totalSupplied={pool.totalSupplied}
            totalBorrowed={pool.totalBorrowed}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <TotalBorrowChart
            totalBorrowed={pool.totalBorrowed}
            seed={chartSeed}
          />
          <BorrowApyChart borrowApy={pool.borrowAPY} seed={chartSeed} />
        </div>
      </div>
    </>
  );
}
