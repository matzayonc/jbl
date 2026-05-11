import { useLendingAccounts } from "@/hooks/program/useLendingAccounts";
import { poolDataToDisplayPool } from "@/lib/poolDisplay";
import { connection } from "@/lib/program";
import { MINTER_PUBKEY } from "@/store/wallet.store";
import type { PoolData } from "@/types/lending";
import type { MultiplyMeta, Pool } from "@/types/pool";
import { getMint } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";

export const MAX_MULTIPLY = 30;

/** Check if a mint has the valid faucet authority */
async function hasValidMinter(mint: PublicKey): Promise<boolean> {
  try {
    const info = await getMint(connection, mint);
    return info.mintAuthority?.toBase58() === MINTER_PUBKEY.toBase58();
  } catch {
    return false;
  }
}

/** Check if a pool has at least one valid faucet mint */
async function poolHasValidMinter(pool: PoolData): Promise<boolean> {
  const [collateralValid, lendValid] = await Promise.all([
    hasValidMinter(pool.collateralMint),
    hasValidMinter(pool.lendMint),
  ]);
  return collateralValid || lendValid;
}

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
  const { data: poolsData = [], isLoading, error } = useLendingAccounts();
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
        const isValid = await poolHasValidMinter(pd);
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

  return { data: strategies, isLoading: isLoading || isValidating, error };
}

/** Returns a single multiply strategy by pool address. */
export function useMultiplyStrategy(address: string | undefined) {
  const { data: strategies, isLoading, error } = useMultiplyStrategies();

  const strategy = useMemo<MultiplyStrategy | null>(
    () =>
      address
        ? (strategies.find((s) => s.address === address) ?? null)
        : null,
    [strategies, address],
  );

  return { data: strategy, isLoading, error };
}

