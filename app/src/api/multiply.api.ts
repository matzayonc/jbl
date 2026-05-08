import { MULTIPLY_META } from "@/lib/mocks/multiply.mock";
import { POOLS } from "@/lib/mocks/pools.mock";
import type { MultiplyMeta, Pool } from "@/types/pool";

const SIMULATED_DELAY_MS = 600;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface MultiplyStrategy extends Pool {
  meta: MultiplyMeta;
}

export async function fetchMultiplyStrategies(): Promise<MultiplyStrategy[]> {
  await delay(SIMULATED_DELAY_MS);
  return POOLS.filter((p) => MULTIPLY_META[p.id]).map((p) => ({
    ...p,
    meta: MULTIPLY_META[p.id],
  }));
}

export async function fetchMultiplyStrategyById(
  id: string,
): Promise<MultiplyStrategy | null> {
  await delay(SIMULATED_DELAY_MS);
  const pool = POOLS.find((p) => p.id === id);
  const meta = MULTIPLY_META[id];
  if (!pool || !meta) return null;
  return { ...pool, meta };
}
