import { useValidLendingAccounts } from "@/hooks/program/useValidLendingAccounts";
import { poolDataToDisplayPool } from "@/lib/poolDisplay";
import type { MultiplyMeta, Pool } from "@/types/pool";
import { useEffect, useMemo, useState } from "react";
import { isMultiplyPoolValid } from "@/lib/validation";
import type { PoolData } from "@/types/lending";

export const MAX_MULTIPLY = 30;

export interface MultiplyStrategy extends Pool {
  meta: MultiplyMeta;
}

/**
 * Derives a MultiplyMeta from an already-mapped Pool.
 * Max multiplier is hardcoded at 30×.
 * Max net APY is computed at full leverage: L×supplyAPY − (L−1)×borrowAPY.
 */
export function buildMultiplyMeta(pool: Pool): MultiplyMeta {
  const maxNetAPY = Math.max(
    0,
    MAX_MULTIPLY * pool.supplyAPY - (MAX_MULTIPLY - 1) * pool.borrowAPY,
  );
  return {
    maxMultiplier: MAX_MULTIPLY,
    maxNetAPY,
    // Lend token is the debt in a multiply position (borrowed against collateral)
    debtSymbol: pool.lendSymbol,
    debtIcon: pool.lendIcon,
  };
}

/** Returns all on-chain pools as multiply strategies (one strategy per pool). */
export function useMultiplyStrategies() {
  const { data: poolsData = [], isLoading, error } = useValidLendingAccounts();
  const [validPools, setValidPools] = useState<PoolData[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (poolsData.length === 0) {
      setValidPools([]);
      return;
    }

    setIsValidating(true);
    Promise.all(
      poolsData.map(async (pd) => {
        const isValid = await isMultiplyPoolValid(pd);
        return { pd, isValid };
      })
    )
      .then((results) => {
        setValidPools(results.filter((r) => r.isValid).map((r) => r.pd));
        setIsValidating(false);
      })
      .catch(() => {
        setValidPools([]);
        setIsValidating(false);
      });
  }, [poolsData]);

  const strategies = useMemo<MultiplyStrategy[]>(
    () =>
      validPools.map((pd) => {
        const pool = poolDataToDisplayPool(pd);
        return { ...pool, meta: buildMultiplyMeta(pool) };
      }),
    [validPools],
  );

  return { data: strategies, isLoading };
}

/** Returns a single multiply strategy by pool address. */
export function useMultiplyStrategy(address: string | undefined) {
  const { data: strategies, isLoading } = useMultiplyStrategies();

  const strategy = useMemo<MultiplyStrategy | null>(
    () =>
      address
        ? (strategies.find((s) => s.address === address) ?? null)
        : null,
    [strategies, address],
  );

  return { data: strategy, isLoading };
}
