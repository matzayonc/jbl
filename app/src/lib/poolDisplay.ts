import { getPoolMeta } from '@/config/poolRegistry'
import type { PoolData, UtilizationFeeConfig } from '@/types/lending'
import type { Pool } from '@/types/pool'


/**
 * On-chain token amounts use 6 decimal places (USDC / USDT style).
 * Divide raw bigint/number values by this factor to get UI amounts.
 */
const LEND_DECIMALS = 6
const COLLATERAL_DECIMALS = 6
const DECIMALS_FACTOR = 10 ** LEND_DECIMALS

/**
 * Replicate the on-chain piecewise linear fee model in TypeScript.
 * Returns the borrow rate in basis points (e.g. 500 = 5%).
 * utilization_bps: 0..10_000
 */
export function computeFeeBps(config: UtilizationFeeConfig, utilizationBps: number): number {
    const u = Math.max(0, Math.min(10_000, utilizationBps))
    const y1 = Math.floor(Number(config.m1) * u / 10_000) + Number(config.c1)
    const y2 = Math.floor(Number(config.m2) * u / 10_000) + Number(config.c2)
    return Math.max(y1, y2, 0)
}

/**
 * Derive APY figures and utilization from on-chain pool state.
 * Assumes 6-decimal lend tokens (USDC/USDT style). Supply APY uses the
 * standard formula: supply_apy = borrow_apy × utilization.
 */
export function derivePoolMetrics(pd: PoolData): {
    utilizationBps: number
    utilizationPct: number
    borrowAPY: number
    supplyAPY: number
    totalBorrowedRaw: number
    totalLendRaw: number
    availableLiquidityRaw: number
    totalCollateralRaw: number
} {
    const totalLendRaw = Number(pd.totalLendDeposited)
    const totalBorrowedRaw = Number(pd.totalBorrowed)
    const totalCollateralRaw = Number(pd.totalCollateralDeposited)

    // total_lend_deposited tracks total deposits and does NOT decrease when
    // tokens are borrowed out. Utilization mirrors the on-chain formula:
    //   utilization = total_borrowed / total_lend_deposited
    const utilizationBps =
        totalLendRaw > 0
            ? Math.min(10_000, Math.round((totalBorrowedRaw / totalLendRaw) * 10_000))
            : 0

    const utilizationPct = utilizationBps / 100

    const borrowRateBps = computeFeeBps(pd.feeConfig, utilizationBps)
    const borrowAPY = borrowRateBps / 100
    const supplyAPY = borrowAPY * (utilizationPct / 100)

    const availableLiquidityRaw = totalLendRaw - totalBorrowedRaw

    return {
        utilizationBps,
        utilizationPct,
        borrowAPY,
        supplyAPY,
        totalBorrowedRaw,
        totalLendRaw,
        availableLiquidityRaw,
        totalCollateralRaw,
    }
}

/**
 * Map on-chain PoolData to the display-friendly Pool shape used by UI
 * components. Amounts are kept as raw token counts (no USD valuation since
 * no price oracle is available).
 *
 * `address` and `id` are both the pool's own PublicKey base-58 string so
 * routing with `/pool/:address` resolves back to the same account.
 */
export function poolDataToDisplayPool(pd: PoolData): Pool {
    const metrics = derivePoolMetrics(pd)
    const addr = pd.publicKey.toBase58()
    const meta = getPoolMeta(addr)

    return {
        id: addr,
        address: addr,
        ...meta,
        supplyAPY: metrics.supplyAPY,
        borrowAPY: metrics.borrowAPY,
        // Convert raw 6-decimal amounts to human-readable UI values
        totalSupplied: metrics.totalLendRaw / DECIMALS_FACTOR,
        totalBorrowed: metrics.totalBorrowedRaw / DECIMALS_FACTOR,
        totalCollateral: metrics.totalCollateralRaw / (10 ** COLLATERAL_DECIMALS),
        utilization: metrics.utilizationPct,
        ltv: pd.ltvPercent,
        availableLiquidity: metrics.availableLiquidityRaw / DECIMALS_FACTOR,
    }
}
