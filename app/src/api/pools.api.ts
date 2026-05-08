import { getPoolById, POOLS } from "@/lib/mocks/pools.mock";
import type { Pool } from "@/types/pool";

const SIMULATED_DELAY_MS = 600;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchPools(): Promise<Pool[]> {
  await delay(SIMULATED_DELAY_MS);
  return POOLS;
}

export async function fetchPoolById(id: string): Promise<Pool | null> {
  await delay(SIMULATED_DELAY_MS);
  return getPoolById(id) ?? null;
}
