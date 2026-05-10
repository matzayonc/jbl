import type { PoolData, UtilizationFeeConfig } from '@/types/lending'
import type { Pool } from '@/types/pool'

/** Default icon shown when no token metadata is available. */
export const FALLBACK_ICON =
    'https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&dpr=2&quality=80'

    export const FALLBACK_ICON_2 = "https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEs9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB%2Flogo.svg&dpr=2&quality=80"
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

    // total_lend_deposited tracks the *available* balance — it decreases as
    // tokens are borrowed out. True total supply = available + borrowed.
    const totalLendSupply = totalLendRaw + totalBorrowedRaw

    const utilizationBps =
        totalLendSupply > 0
            ? Math.min(10_000, Math.round((totalBorrowedRaw / totalLendSupply) * 10_000))
            : 0

    const utilizationPct = utilizationBps / 100

    const borrowRateBps = computeFeeBps(pd.feeConfig, utilizationBps)
    const borrowAPY = borrowRateBps / 100
    const supplyAPY = borrowAPY * (utilizationPct / 100)

    const availableLiquidityRaw = totalLendRaw // what remains available to borrow

    return {
        utilizationBps,
        utilizationPct,
        borrowAPY,
        supplyAPY,
        totalBorrowedRaw,
        totalLendRaw: totalLendSupply,   // expose total supply (available + borrowed)
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

    return {
        id: addr,
        address: addr,
        // Primary identity = lend token (the asset lenders supply / borrowers receive)
        name: "Tether USD",
        symbol: "USDT",
        icon: FALLBACK_ICON_2,
        collateralSymbol: "USDC",
        collateralIcon: FALLBACK_ICON,
        lendSymbol: "USDT",
        lendIcon: FALLBACK_ICON_2,
        supplyAPY: metrics.supplyAPY,
        borrowAPY: metrics.borrowAPY,
        // Convert raw 6-decimal amounts to human-readable UI values
        totalSupplied: metrics.totalLendRaw / DECIMALS_FACTOR,
        totalBorrowed: metrics.totalBorrowedRaw / DECIMALS_FACTOR,
        totalCollateral: metrics.totalCollateralRaw / (10 ** COLLATERAL_DECIMALS),
        utilization: metrics.utilizationPct,
        ltv: pd.ltvPercent,
        category: 'stablecoin' as const,
        availableLiquidity: metrics.availableLiquidityRaw / DECIMALS_FACTOR,
    }
}
