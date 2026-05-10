import { BackButton } from "@/components/common/BackButton";
import { BorrowModal } from "@/components/pool/BorrowModal";
import { DepositModal } from "@/components/pool/DepositModal";
import { ParticipateModal } from "@/components/pool/ParticipateModal";
import { PoolHero, PoolStatsBar } from "@/components/pool/PoolHero";
import {
  UtilizationGauge,
  UtilizationInfoPanel,
} from "@/components/pool/UtilizationGauge";
import { BorrowApyChart } from "@/components/pool/charts/BorrowApyChart";
import { SupplyApyChart } from "@/components/pool/charts/SupplyApyChart";
import { TotalBorrowChart } from "@/components/pool/charts/TotalBorrowChart";
import { TotalSupplyChart } from "@/components/pool/charts/TotalSupplyChart";
import { PoolPositionPanel } from "@/components/portfolio/PoolPositionPanel";
import { useLendingAccount } from "@/hooks/program/useLendingAccount";
import { poolDataToDisplayPool } from "@/lib/poolDisplay";
import { useWalletConnection } from "@solana/react-hooks";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

type ModalMode = "deposit" | "borrow" | "participate";

export function PoolDetailPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { connected } = useWalletConnection();
  const [modal, setModal] = useState<ModalMode | null>(null);

  const poolPubKey = useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);

  const { data: poolData, isLoading } = useLendingAccount(poolPubKey);

  const pool = useMemo(
    () => (poolData ? poolDataToDisplayPool(poolData) : null),
    [poolData],
  );

  const chartSeed = useMemo(
    () => (address ? address.charCodeAt(0) + address.charCodeAt(1) : 42),
    [address],
  );

  if (!poolPubKey) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <BackButton to="/" label="Back to markets" />
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <p className="text-[#efe0f7]/50 text-sm">Invalid pool address.</p>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-[#c698e5] hover:underline"
          >
            ← Back to markets
          </button>
        </div>
      </div>
    );
  }

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
      {modal === "deposit" && pool && poolData && (
        <DepositModal
          pool={pool}
          poolData={poolData}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "borrow" && pool && poolData && (
        <BorrowModal
          pool={pool}
          poolData={poolData}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "participate" && pool && poolData && (
        <ParticipateModal
          pool={pool}
          poolData={poolData}
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
          onLend={() => setModal("participate")}
        />

        <PoolStatsBar pool={pool} />

        <div className="mt-5">
          <PoolPositionPanel
            pool={pool}
            poolData={poolData!}
            connected={connected}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <TotalSupplyChart
            totalSupplied={pool.totalSupplied}
            seed={chartSeed}
          />
          <SupplyApyChart supplyApy={pool.supplyAPY} seed={chartSeed} />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3">
            <UtilizationGauge
              utilization={pool.utilization}
              totalSupplied={pool.totalSupplied}
              totalBorrowed={pool.totalBorrowed}
            />
          </div>
          <div className="lg:col-span-1 h-full">
            <UtilizationInfoPanel />
          </div>
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
